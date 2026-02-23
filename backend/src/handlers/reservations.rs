use crate::{db::DbPool, handlers::auth::extract_claims, models::*};
use actix_web::{web, HttpRequest, HttpResponse};
use uuid::Uuid;

/// FR-002: จองหนังสือ (Reserve Book)
/// Acceptance: หนังสือสถานะ 'available' → เปลี่ยนเป็น 'reserved', หมดอายุใน 3 วัน
pub async fn create_reservation(
    pool: web::Data<DbPool>,
    req: HttpRequest,
    body: web::Json<ReservationRequest>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let now = chrono::Utc::now();
    let expires = now + chrono::Duration::days(3); // จองได้ 3 วัน
    let id = Uuid::new_v4().to_string();
    let now_str = now.to_rfc3339();
    let expires_str = expires.to_rfc3339();

    // ตรวจสอบห้องว่าง
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

    // ตรวจสอบการจองซ้ำ (active หรือ waiting)
    let already: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM reservations WHERE user_id = $1 AND book_id = $2 AND status IN ('active', 'waiting')",
    )
    .bind(&claims.sub)
    .bind(&body.book_id)
    .fetch_one(&pool.pool)
    .await
    .unwrap_or(0);

    if already > 0 {
        return HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("คุณได้จองหรือเข้าคิวหนังสือเล่มนี้แล้ว"));
    }

    let status = if available > 0 { "active" } else { "waiting" };

    // บันทึกการจอง
    let _ = sqlx::query(
        "INSERT INTO reservations (id, user_id, book_id, reserved_at, expires_at, status) VALUES ($1,$2,$3,$4,$5,$6)",
    )
    .bind(&id)
    .bind(&claims.sub)
    .bind(&body.book_id)
    .bind(&now_str)
    .bind(&expires_str)
    .bind(status)
    .execute(&pool.pool)
    .await;

    if status == "active" {
        // ลด available_copies และอัพเดท status
        let _ = sqlx::query(
            "UPDATE books SET available_copies = available_copies - 1, status = CASE WHEN available_copies - 1 <= 0 THEN 'reserved' ELSE status END, updated_at = $1 WHERE id = $2",
        )
        .bind(&now_str)
        .bind(&body.book_id)
        .execute(&pool.pool)
        .await;
    }

    let message = if status == "active" {
        "จองหนังสือสำเร็จ กรุณามารับภายใน 3 วัน"
    } else {
        "หนังสือไม่ว่าง ระบบได้เพิ่มคุณเข้าในรายการรอคิวแล้ว"
    };

    HttpResponse::Created().json(ApiResponse::success(serde_json::json!({
        "reservation_id": id,
        "expires_at": if status == "active" { Some(expires_str) } else { None },
        "status": status,
        "message": message
    })))
}

/// ยกเลิกการจอง
pub async fn cancel_reservation(
    pool: web::Data<DbPool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let res_id = path.into_inner();
    let now = chrono::Utc::now().to_rfc3339();

    let book_id: Result<String, _> = sqlx::query_scalar(
        "SELECT book_id FROM reservations WHERE id = $1 AND user_id = $2 AND status = 'active'",
    )
    .bind(&res_id)
    .bind(&claims.sub)
    .fetch_one(&pool.pool)
    .await;

    match book_id {
        Ok(bid) => {
            let _ = sqlx::query("UPDATE reservations SET status = 'cancelled' WHERE id = $1")
                .bind(&res_id)
                .execute(&pool.pool)
                .await;

            // คืน available_copies
            let _ = sqlx::query(
                "UPDATE books SET available_copies = available_copies + 1, status = 'available', updated_at = $1 WHERE id = $2",
            )
            .bind(&now)
            .bind(&bid)
            .execute(&pool.pool)
            .await;

            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"cancelled": true})))
        }
        Err(_) => HttpResponse::NotFound().json(ApiResponse::<()>::error("Reservation not found")),
    }
}

/// รายการการจองของฉัน (FR-001 + FR-002)
pub async fn my_reservations(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let reservations = sqlx::query_as::<_, Reservation>(
        "SELECT r.id, r.user_id, r.book_id, b.title as book_title, b.cover_url as book_cover,
          r.reserved_at, r.expires_at, r.status
          FROM reservations r LEFT JOIN books b ON r.book_id = b.id
          WHERE r.user_id = $1 ORDER BY r.reserved_at DESC",
    )
    .bind(&claims.sub)
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(ApiResponse::success(reservations))
}

/// FR-003: คำนวณและอัพเดทค่าปรับทุกรายการที่เกินกำหนด (เรียกได้จาก Cron หรือ manual)
pub async fn calculate_fines(pool: web::Data<DbPool>) -> HttpResponse {
    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();

    // ดึงรายการที่เกินกำหนด
    let overdue: Vec<(String, String, String)> = sqlx::query_as::<_, (String, String, String)>(
        "SELECT br.id, br.due_date, u.role FROM borrows br
         JOIN users u ON br.user_id = u.id
         WHERE br.status = 'active' AND br.due_date < $1",
    )
    .bind(&now_str)
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    let mut updated = 0;
    for (id, due_date_str, role) in &overdue {
        let due = chrono::DateTime::parse_from_rfc3339(due_date_str)
            .map(|d| d.with_timezone(&chrono::Utc))
            .unwrap_or(now);
        let days_overdue = (now - due).num_days().max(0);
        let fine = days_overdue as f64 * fine_rate_per_day(role);

        let _ =
            sqlx::query("UPDATE borrows SET fine_amount = $1, status = 'overdue' WHERE id = $2")
                .bind(fine)
                .bind(id)
                .execute(&pool.pool)
                .await;
        updated += 1;
    }

    HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "updated": updated,
        "calculated_at": now_str
    })))
}

/// รายการค่าปรับของฉัน
pub async fn my_fines(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let now_str = chrono::Utc::now().to_rfc3339();

    let rows: Vec<(String, Option<String>, String, f64, bool)> =
        sqlx::query_as::<_, (String, Option<String>, String, f64, bool)>(
            "SELECT br.id, b.title, br.due_date, br.fine_amount, br.fine_paid
         FROM borrows br LEFT JOIN books b ON br.book_id = b.id
         WHERE br.user_id = $1 AND br.fine_amount > 0 ORDER BY br.borrowed_at DESC",
        )
        .bind(&claims.sub)
        .fetch_all(&pool.pool)
        .await
        .unwrap_or_default();

    let fines: Vec<FineInfo> = rows
        .into_iter()
        .map(|(id, title, due_date_str, fine_amount, fine_paid)| {
            let due = chrono::DateTime::parse_from_rfc3339(&due_date_str)
                .map(|d| d.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());
            let now_dt = chrono::DateTime::parse_from_rfc3339(&now_str)
                .map(|d| d.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());
            let days_overdue = (now_dt - due).num_days().max(0);

            FineInfo {
                borrow_id: id,
                book_title: title,
                days_overdue,
                fine_amount,
                fine_paid,
            }
        })
        .collect();

    HttpResponse::Ok().json(ApiResponse::success(fines))
}
