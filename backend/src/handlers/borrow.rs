use crate::{db::DbPool, handlers::auth::extract_claims, models::*, realtime::Hub};
use actix_web::{web, HttpRequest, HttpResponse};
use std::sync::Arc;
use uuid::Uuid;

/// ยืมหนังสือ — loan duration ขึ้นกับ role (student=14วัน, professor=30วัน)
pub async fn borrow_book(
    pool: web::Data<DbPool>,
    hub: web::Data<Arc<Hub>>,
    req: HttpRequest,
    body: web::Json<BorrowRequest>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let now = chrono::Utc::now();
    let max_days = loan_duration_days(&claims.role);
    let max_due = now + chrono::Duration::days(max_days);

    // Parse due_date from request or use default
    let due_date = if let Some(ref d_str) = body.due_date {
        match chrono::DateTime::parse_from_rfc3339(d_str) {
            Ok(d) => {
                let dt = d.with_timezone(&chrono::Utc);
                if dt <= now {
                    return HttpResponse::BadRequest()
                        .json(ApiResponse::<()>::error("กำหนดคืนต้องเป็นอนาคต"));
                }
                // Cap at max days allowed for role
                if dt > max_due {
                    max_due
                } else {
                    dt
                }
            }
            Err(_) => max_due,
        }
    } else {
        max_due
    };

    let borrow_id = Uuid::new_v4().to_string();
    let now_str = now.to_rfc3339();
    let due_str = due_date.to_rfc3339();

    // ตรวจสอบว่าหนังสือมีอยู่และว่างหรือไม่
    let available: i32 =
        match sqlx::query_scalar::<_, i32>("SELECT available_copies FROM books WHERE id = $1")
            .bind(&body.book_id)
            .fetch_one(&pool.pool)
            .await
        {
            Ok(v) => v,
            Err(_) => return HttpResponse::NotFound().json(ApiResponse::<()>::error("ไม่พบหนังสือ")),
        };

    if available <= 0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("หนังสือไม่ว่าง"));
    }

    // ตรวจสอบว่ายืมซ้ำหรือไม่
    let already: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM borrows WHERE user_id = $1 AND book_id = $2 AND status = 'active'",
    )
    .bind(&claims.sub)
    .bind(&body.book_id)
    .fetch_one(&pool.pool)
    .await
    .unwrap_or(0);

    if already > 0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("คุณกำลังยืมหนังสือเล่มนี้อยู่"));
    }

    // บันทึกการยืม
    match sqlx::query(
        "INSERT INTO borrows (id, user_id, book_id, reservation_id, borrowed_at, due_date, fine_amount, fine_paid, status) VALUES ($1,$2,$3,$4,$5,$6,0.0,FALSE,'active')",
    )
    .bind(&borrow_id)
    .bind(&claims.sub)
    .bind(&body.book_id)
    .bind(&body.reservation_id)
    .bind(&now_str)
    .bind(&due_str)
    .execute(&pool.pool)
    .await {
        Ok(_) => (),
        Err(_) => return HttpResponse::InternalServerError().json(ApiResponse::<()>::error("เกิดข้อผิดพลาด")),
    }

    // ลด available_copies
    let _ = sqlx::query(
        "UPDATE books SET available_copies = available_copies - 1, borrow_count = borrow_count + 1, status = CASE WHEN available_copies - 1 <= 0 THEN 'borrowed' ELSE 'available' END, updated_at = $1 WHERE id = $2",
    )
    .bind(&now_str)
    .bind(&body.book_id)
    .execute(&pool.pool)
    .await;

    // ถ้ายืมจากการจอง → อัพเดท reservation status
    if let Some(ref res_id) = body.reservation_id {
        let _ = sqlx::query("UPDATE reservations SET status = 'converted' WHERE id = $1")
            .bind(res_id)
            .execute(&pool.pool)
            .await;
    }

    let actual_days = (due_date - now).num_days();

    // Realtime Notifications
    hub.notify_user(
        &claims.sub,
        "LOAN_UPDATED",
        serde_json::json!({
            "type": "borrow",
            "book_id": body.book_id
        }),
    );
    hub.broadcast(
        "BOOK_STOCK_UPDATED",
        serde_json::json!({
            "book_id": body.book_id
        }),
    );

    HttpResponse::Created().json(ApiResponse::success(serde_json::json!({
        "borrow_id": borrow_id,
        "due_date": due_str,
        "loan_days": actual_days,
        "message": format!("ยืมหนังสือสำเร็จ กำหนดคืนใน {} วัน", actual_days)
    })))
}

/// คืนหนังสือ — คำนวณค่าปรับถ้าเกินกำหนด (FR-003)
pub async fn return_book(
    pool: web::Data<DbPool>,
    hub: web::Data<Arc<Hub>>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let borrow_id = path.into_inner();
    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();

    // ดึงข้อมูลการยืม
    let result = sqlx::query_as::<_, (String, String)>(
        "SELECT book_id, due_date FROM borrows WHERE id = $1 AND user_id = $2 AND status IN ('active','overdue')",
    )
    .bind(&borrow_id)
    .bind(&claims.sub)
    .fetch_one(&pool.pool)
    .await;

    match result {
        Ok((book_id, due_date_str)) => {
            // คำนวณค่าปรับ (FR-003)
            let due = chrono::DateTime::parse_from_rfc3339(&due_date_str)
                .map(|d| d.with_timezone(&chrono::Utc))
                .unwrap_or(now);
            let days_overdue = (now - due).num_days().max(0);
            let fine = days_overdue as f64 * fine_rate_per_day(&claims.role);

            // อัพเดทสถานะ
            let _ = sqlx::query(
                "UPDATE borrows SET status = 'returned', returned_at = $1, fine_amount = $2 WHERE id = $3",
            )
            .bind(&now_str)
            .bind(fine)
            .bind(&borrow_id)
            .execute(&pool.pool)
            .await;

            // ตรวจสอบว่ามีคนจอง (Waiting) อยู่หรือไม่
            let next_res: Option<(String,)> = sqlx::query_as(
                "SELECT id FROM reservations WHERE book_id = $1 AND status = 'waiting' ORDER BY reserved_at ASC LIMIT 1"
            )
            .bind(&book_id)
            .fetch_optional(&pool.pool)
            .await
            .unwrap_or(None);

            if let Some((res_id,)) = next_res {
                // เปลี่ยนสถานะการจองเป็น active และตั้งวันหมดอายุ (3 วันนับจากนี้)
                let expires = now + chrono::Duration::days(3);
                let expires_str = expires.to_rfc3339();

                let _ = sqlx::query(
                    "UPDATE reservations SET status = 'active', reserved_at = $1, expires_at = $2 WHERE id = $3"
                )
                .bind(&now_str)
                .bind(&expires_str)
                .bind(&res_id)
                .execute(&pool.pool)
                .await;

                // สถานะหนังสือยังเป็น 'reserved' เพราะมีเจ้าของคิวใหม่แล้ว
                let _ = sqlx::query(
                    "UPDATE books SET status = 'reserved', updated_at = $1 WHERE id = $2",
                )
                .bind(&now_str)
                .bind(&book_id)
                .execute(&pool.pool)
                .await;
            } else {
                // ไม่มีคนต่อคิว -> เพิ่ม available_copies กลับ
                let _ = sqlx::query(
                    "UPDATE books SET available_copies = available_copies + 1, status = 'available', updated_at = $1 WHERE id = $2",
                )
                .bind(&now_str)
                .bind(&book_id)
                .execute(&pool.pool)
                .await;
            }

            // Realtime Notifications
            hub.notify_user(
                &claims.sub,
                "LOAN_UPDATED",
                serde_json::json!({
                    "type": "return",
                    "book_id": book_id
                }),
            );
            hub.broadcast(
                "BOOK_STOCK_UPDATED",
                serde_json::json!({
                    "book_id": book_id
                }),
            );

            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "returned": true,
                "days_overdue": days_overdue,
                "fine_amount": fine,
                "message": if fine > 0.0 {
                    format!("คืนหนังสือสำเร็จ มีค่าปรับ {:.2} บาท", fine)
                } else {
                    "คืนหนังสือสำเร็จ ไม่มีค่าปรับ".to_string()
                }
            })))
        }
        Err(_) => HttpResponse::NotFound().json(ApiResponse::<()>::error("ไม่พบรายการยืม")),
    }
}

/// ประวัติการยืมของฉัน
pub async fn my_borrows(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let borrows = sqlx::query_as::<_, Borrow>(
        "SELECT br.id, br.user_id, br.book_id, b.title as book_title, b.cover_url as book_cover,
                br.reservation_id, br.borrowed_at, br.due_date, br.returned_at,
                br.fine_amount, br.fine_paid, br.status
         FROM borrows br LEFT JOIN books b ON br.book_id = b.id
         WHERE br.user_id = $1 ORDER BY br.borrowed_at DESC",
    )
    .bind(&claims.sub)
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(ApiResponse::success(borrows))
}

/// รายการการยืมทั้งหมด (สำหรับบรรณารักษ์)
pub async fn list_all_borrows(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    // Check role from DB for real-time permissions
    let db_role: String = match sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(&claims.sub)
        .fetch_one(&pool.pool)
        .await
    {
        Ok(r) => r,
        Err(_) => return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Forbidden")),
    };

    if db_role != "librarian" {
        return HttpResponse::Forbidden()
            .json(ApiResponse::<()>::error("Forbidden: Librarian only"));
    }

    match sqlx::query_as::<_, Borrow>(
        "SELECT br.id, br.user_id, u.username, u.full_name as user_full_name, br.book_id, b.title as book_title, b.cover_url as book_cover,
                br.reservation_id, br.borrowed_at, br.due_date, br.returned_at,
                br.fine_amount, br.fine_paid, br.status
         FROM borrows br 
         LEFT JOIN books b ON br.book_id = b.id
         LEFT JOIN users u ON br.user_id = u.id
         ORDER BY br.borrowed_at DESC",
    )
    .fetch_all(&pool.pool)
    .await {
        Ok(borrows) => HttpResponse::Ok().json(ApiResponse::success(borrows)),
        Err(e) => {
            log::error!("Failed to fetch all borrows: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error("Database error"))
        }
    }
}
