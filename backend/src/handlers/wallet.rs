use crate::{db::DbPool, handlers::auth::extract_claims, models::*, realtime::Hub};
use actix_web::{web, HttpRequest, HttpResponse};
use std::sync::Arc;
use uuid::Uuid;

/// ดึงข้อมูล Wallet ของผู้ใช้ (สร้างให้อัตโนมัติถ้ายังไม่มี)
pub async fn get_wallet(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized()
                .json(ApiResponse::<()>::error("Unauthorized (Token Error)"))
        }
    };

    let now = chrono::Utc::now().to_rfc3339();
    let wallet_id = Uuid::new_v4().to_string();

    // Upsert wallet — สร้างถ้ายังไม่มี
    let _ = sqlx::query(
        "INSERT INTO wallets (id, user_id, balance, updated_at) VALUES ($1, $2, 0.0, $3) ON CONFLICT (user_id) DO NOTHING",
    )
    .bind(&wallet_id)
    .bind(&claims.sub)
    .bind(&now)
    .execute(&pool.pool)
    .await;

    match sqlx::query_as::<_, Wallet>(
        "SELECT id, user_id, balance, updated_at FROM wallets WHERE user_id = $1",
    )
    .bind(&claims.sub)
    .fetch_one(&pool.pool)
    .await
    {
        Ok(w) => HttpResponse::Ok().json(ApiResponse::success(w)),
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("ไม่สามารถดึงข้อมูล Wallet ได้")),
    }
}

/// เติมเงินเข้า Wallet
pub async fn top_up(
    pool: web::Data<DbPool>,
    hub: web::Data<Arc<Hub>>,
    req: HttpRequest,
    body: web::Json<TopUpRequest>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Unauthorized (Missing or Invalid Token)",
            ))
        }
    };

    if body.amount <= 0.0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("จำนวนเงินต้องมากกว่า 0"));
    }
    if body.amount > 100000.0 {
        return HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("เติมเงินได้สูงสุด 100,000 บาทต่อครั้ง"));
    }

    let now = chrono::Utc::now().to_rfc3339();
    let wallet_id = Uuid::new_v4().to_string();

    // สร้าง wallet ถ้ายังไม่มี
    let _ = sqlx::query(
        "INSERT INTO wallets (id, user_id, balance, updated_at) VALUES ($1, $2, 0.0, $3) ON CONFLICT (user_id) DO NOTHING",
    )
    .bind(&wallet_id)
    .bind(&claims.sub)
    .bind(&now)
    .execute(&pool.pool)
    .await;

    // เพิ่มยอดเงิน
    let updated = sqlx::query(
        "UPDATE wallets SET balance = balance + $1, updated_at = $2 WHERE user_id = $3",
    )
    .bind(body.amount)
    .bind(&now)
    .bind(&claims.sub)
    .execute(&pool.pool)
    .await;

    if updated.is_err() {
        return HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("เกิดข้อผิดพลาดในการเติมเงิน"));
    }

    // บันทึก transaction
    let tx_id = Uuid::new_v4().to_string();
    let _ = sqlx::query(
        "INSERT INTO wallet_transactions (id, user_id, tx_type, amount, description, created_at) VALUES ($1,$2,'topup',$3,$4,$5)",
    )
    .bind(&tx_id)
    .bind(&claims.sub)
    .bind(body.amount)
    .bind(format!("เติมเงิน ฿{:.2}", body.amount))
    .bind(&now)
    .execute(&pool.pool)
    .await;

    // ดึงยอดใหม่
    let new_balance: f64 = sqlx::query_scalar("SELECT balance FROM wallets WHERE user_id = $1")
        .bind(&claims.sub)
        .fetch_one(&pool.pool)
        .await
        .unwrap_or(0.0);

    // ส่งแจ้งเตือน Realtime
    hub.notify_user(
        &claims.sub,
        "WALLET_UPDATED",
        serde_json::json!({
            "balance": new_balance,
            "type": "topup",
            "amount": body.amount
        }),
    );

    HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "balance": new_balance,
        "topped_up": body.amount,
        "message": format!("เติมเงินสำเร็จ ฿{:.2}", body.amount)
    })))
}

/// จ่ายค่าปรับด้วย Wallet
pub async fn pay_fine(
    pool: web::Data<DbPool>,
    hub: web::Data<Arc<Hub>>,
    req: HttpRequest,
    body: web::Json<PayFineRequest>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => {
            return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(
                "Unauthorized (Payment Token Error)",
            ))
        }
    };

    let now = chrono::Utc::now().to_rfc3339();

    // ดึงข้อมูลค่าปรับ
    let row: Option<(f64, bool, Option<String>)> = sqlx::query_as(
        "SELECT br.fine_amount, br.fine_paid, b.title FROM borrows br LEFT JOIN books b ON br.book_id = b.id WHERE br.id = $1 AND br.user_id = $2",
    )
    .bind(&body.borrow_id)
    .bind(&claims.sub)
    .fetch_optional(&pool.pool)
    .await
    .unwrap_or(None);

    let (fine_amount, fine_paid, book_title) = match row {
        Some(r) => r,
        None => return HttpResponse::NotFound().json(ApiResponse::<()>::error("ไม่พบรายการยืม")),
    };

    if fine_paid {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("ชำระค่าปรับนี้แล้ว"));
    }

    if fine_amount <= 0.0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("ไม่มีค่าปรับที่ต้องชำระ"));
    }

    // ตรวจสอบยอดกระเป๋า
    let wallet_id = Uuid::new_v4().to_string();
    let _ = sqlx::query(
        "INSERT INTO wallets (id, user_id, balance, updated_at) VALUES ($1, $2, 0.0, $3) ON CONFLICT (user_id) DO NOTHING",
    )
    .bind(&wallet_id)
    .bind(&claims.sub)
    .bind(&now)
    .execute(&pool.pool)
    .await;

    let balance: f64 = sqlx::query_scalar("SELECT balance FROM wallets WHERE user_id = $1")
        .bind(&claims.sub)
        .fetch_one(&pool.pool)
        .await
        .unwrap_or(0.0);

    if balance < fine_amount {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(&format!(
            "ยอดใน Wallet ไม่เพียงพอ (มี ฿{:.2} ต้องการ ฿{:.2})",
            balance, fine_amount
        )));
    }

    // หักยอดจาก wallet
    let _ = sqlx::query(
        "UPDATE wallets SET balance = balance - $1, updated_at = $2 WHERE user_id = $3",
    )
    .bind(fine_amount)
    .bind(&now)
    .bind(&claims.sub)
    .execute(&pool.pool)
    .await;

    // Mark fine as paid
    let _ = sqlx::query("UPDATE borrows SET fine_paid = TRUE WHERE id = $1")
        .bind(&body.borrow_id)
        .execute(&pool.pool)
        .await;

    // บันทึก transaction
    let tx_id = Uuid::new_v4().to_string();
    let title_str = book_title.unwrap_or_else(|| "หนังสือ".to_string());
    let _ = sqlx::query(
        "INSERT INTO wallet_transactions (id, user_id, tx_type, amount, description, created_at) VALUES ($1,$2,'fine_payment',$3,$4,$5)",
    )
    .bind(&tx_id)
    .bind(&claims.sub)
    .bind(fine_amount)
    .bind(format!("จ่ายค่าปรับ — {}", title_str))
    .bind(&now)
    .execute(&pool.pool)
    .await;

    let new_balance: f64 = sqlx::query_scalar("SELECT balance FROM wallets WHERE user_id = $1")
        .bind(&claims.sub)
        .fetch_one(&pool.pool)
        .await
        .unwrap_or(0.0);

    // ส่งแจ้งเตือน Realtime
    hub.notify_user(
        &claims.sub,
        "WALLET_UPDATED",
        serde_json::json!({
            "balance": new_balance,
            "type": "fine_payment",
            "amount": fine_amount
        }),
    );

    HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "paid": fine_amount,
        "new_balance": new_balance,
        "message": format!("จ่ายค่าปรับ ฿{:.2} สำเร็จ", fine_amount)
    })))
}

/// ประวัติ Wallet transactions
pub async fn wallet_transactions(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    match sqlx::query_as::<_, WalletTransaction>(
        "SELECT id, user_id, tx_type, amount, description, created_at FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    )
    .bind(&claims.sub)
    .fetch_all(&pool.pool)
    .await
    {
        Ok(txns) => HttpResponse::Ok().json(ApiResponse::success(txns)),
        Err(_) => HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("ไม่สามารถดึงประวัติ Wallet ได้")),
    }
}
