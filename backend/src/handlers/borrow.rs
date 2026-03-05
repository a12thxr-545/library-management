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
                        .json(ApiResponse::<()>::error("Due date must be in the future"));
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

    // 1. ตรวจสอบค่าปรับค้างชำระเท่านั้น (ยืมฟรี ไม่หักค่าธรรมเนียม)
    let pending_fines: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM borrows WHERE user_id = $1 AND fine_paid = FALSE AND fine_amount > 0",
    )
    .bind(&claims.sub)
    .fetch_one(&pool.pool)
    .await
    .unwrap_or(0);

    if pending_fines > 0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "คุณมีค่าปรับค้างชำระ กรุณาชำระก่อนยืมหนังสือ (You have unpaid fines. Please clear them before borrowing.)",
        ));
    }

    // ตรวจสอบว่าหนังสือมีอยู่และว่างหรือไม่
    let available: i32 =
        match sqlx::query_scalar::<_, i32>("SELECT available_copies FROM books WHERE id = $1")
            .bind(&body.book_id)
            .fetch_one(&pool.pool)
            .await
        {
            Ok(v) => v,
            Err(_) => {
                return HttpResponse::NotFound().json(ApiResponse::<()>::error("Book not found"))
            }
        };

    if available <= 0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("Book unavailable"));
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
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "You are already borrowing this book",
        ));
    }

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
        Ok(_) => {
            // ยืมฟรี ไม่หักค่าธรรมเนียม
            // ค่าปรับจะคำนวณอัตโนมัติเมื่อคืนหนังสือเกินกำหนด
        },
        Err(_) => return HttpResponse::InternalServerError().json(ApiResponse::<()>::error("Error recording borrow")),
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
    hub.broadcast(
        "BORROW_CREATED",
        serde_json::json!({
            "type": "borrow",
            "book_id": body.book_id,
            "user_id": claims.sub
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
        "message": format!("Borrowed successfully. Due in {} days", actual_days)
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

    // ดึงข้อมูลการยืม — บรรณารักษ์/แอดมินคืนให้ใครก็ได้
    let sql = if claims.role == "librarian" || claims.role == "addmin" {
        "SELECT b.book_id, b.due_date, u.role, b.user_id FROM borrows b JOIN users u ON b.user_id = u.id WHERE b.id = $1 AND b.status IN ('active','overdue')"
    } else {
        "SELECT b.book_id, b.due_date, u.role, b.user_id FROM borrows b JOIN users u ON b.user_id = u.id WHERE b.id = $1 AND b.user_id = $2 AND b.status IN ('active','overdue')"
    };

    let result = if claims.role == "librarian" || claims.role == "addmin" {
        sqlx::query_as::<_, (String, String, String, String)>(sql)
            .bind(&borrow_id)
            .fetch_one(&pool.pool)
            .await
    } else {
        sqlx::query_as::<_, (String, String, String, String)>(sql)
            .bind(&borrow_id)
            .bind(&claims.sub)
            .fetch_one(&pool.pool)
            .await
    };

    match result {
        Ok((book_id, due_date_str, borrower_role, borrower_id)) => {
            // คำนวณค่าปรับ (FR-003) — ใช้ role ของคนยืมจริง
            let due = chrono::DateTime::parse_from_rfc3339(&due_date_str)
                .map(|d| d.with_timezone(&chrono::Utc))
                .unwrap_or(now);
            let days_overdue = (now - due).num_days().max(0);
            let fine = days_overdue as f64 * fine_rate_per_day(&borrower_role);

            let mut fine_paid = false;
            let mut remaining_fine = fine;

            if fine > 0.0 {
                // พยายามหักเงินจาก Wallet ของผู้ยืม (หักเท่าที่มี)
                let balance: f64 =
                    sqlx::query_scalar("SELECT balance FROM wallets WHERE user_id = $1")
                        .bind(&borrower_id)
                        .fetch_one(&pool.pool)
                        .await
                        .unwrap_or(0.0);

                if balance > 0.0 {
                    let deduct_amount = if balance >= fine { fine } else { balance };

                    // หักเงิน
                    let _ = sqlx::query(
                        "UPDATE wallets SET balance = balance - $1, updated_at = $2 WHERE user_id = $3",
                    )
                    .bind(deduct_amount)
                    .bind(&now_str)
                    .bind(&borrower_id)
                    .execute(&pool.pool)
                    .await;

                    // บันทึก transaction
                    let tx_id = Uuid::new_v4().to_string();
                    let book_title: String =
                        sqlx::query_scalar("SELECT title FROM books WHERE id = $1")
                            .bind(&book_id)
                            .fetch_one(&pool.pool)
                            .await
                            .unwrap_or_else(|_| "Book".to_string());

                    let _ = sqlx::query("INSERT INTO wallet_transactions (id, user_id, tx_type, amount, description, created_at) VALUES ($1,$2,'fine_payment',$3,$4,$5)")
                        .bind(&tx_id)
                        .bind(&borrower_id)
                        .bind(deduct_amount)
                        .bind(format!("Fine Deduction — {} (Remaining: ฿{:.2})", book_title, fine - deduct_amount))
                        .bind(&now_str)
                        .execute(&pool.pool)
                        .await;

                    remaining_fine = fine - deduct_amount;
                    if remaining_fine <= 0.01 {
                        fine_paid = true;
                    }
                }
            }

            // อัพเดทสถานะการยืม
            let _ = sqlx::query(
                "UPDATE borrows SET status = 'returned', returned_at = $1, fine_amount = $2, fine_paid = $3 WHERE id = $4",
            )
            .bind(&now_str)
            .bind(remaining_fine)
            .bind(fine_paid)
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
            hub.broadcast(
                "BORROW_RETURNED",
                serde_json::json!({
                    "type": "return",
                    "book_id": book_id,
                    "user_id": borrower_id
                }),
            );
            if fine > 0.0 {
                hub.notify_user(
                    &borrower_id,
                    "WALLET_UPDATED",
                    serde_json::json!({ "type": "fine_deduction", "amount": fine }),
                );
            }
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
                    if fine_paid {
                        format!("Returned successfully. Fine of {:.2} THB automatically deducted.", fine)
                    } else {
                        format!("Returned successfully. Outstanding fine: {:.2} THB (Please top up to settle debt).", fine)
                    }
                } else {
                    "Returned successfully. No fine.".to_string()
                }
            })))
        }
        Err(_) => {
            HttpResponse::NotFound().json(ApiResponse::<()>::error("Borrow record not found"))
        }
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

    if db_role != "librarian" && db_role != "addmin" {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Forbidden: Staff only"));
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
