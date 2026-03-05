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

    let current_wallet = match sqlx::query_as::<_, Wallet>(
        "SELECT id, user_id, balance, updated_at FROM wallets WHERE user_id = $1",
    )
    .bind(&claims.sub)
    .fetch_one(&pool.pool)
    .await
    {
        Ok(w) => w,
        Err(_) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<()>::error(
                "Could not fetch wallet information",
            ))
        }
    };

    let mut current_balance = current_wallet.balance;

    if current_balance > 0.0 {
        // --- AUTO-SWEEP DEBT ---
        let pending_borrows = sqlx::query_as::<_, (String, f64, String)>(
            "SELECT br.id, br.fine_amount, b.title 
             FROM borrows br JOIN books b ON br.book_id = b.id 
             WHERE br.user_id = $1 AND br.fine_paid = FALSE AND br.fine_amount > 0 
             ORDER BY br.borrowed_at ASC",
        )
        .bind(&claims.sub)
        .fetch_all(&pool.pool)
        .await
        .unwrap_or_default();

        for (borrow_id, fine, title) in pending_borrows {
            if current_balance <= 0.0 {
                break;
            }
            let pay_amount = if current_balance >= fine {
                fine
            } else {
                current_balance
            };

            // หักเงินลูกหนี้
            let _ = sqlx::query(
                "UPDATE wallets SET balance = balance - $1, updated_at = $2 WHERE user_id = $3",
            )
            .bind(pay_amount)
            .bind(&now)
            .bind(&claims.sub)
            .execute(&pool.pool)
            .await;

            let is_fully_paid = (fine - pay_amount) <= 0.01;
            let _ = sqlx::query(
                "UPDATE borrows SET fine_amount = fine_amount - $1, fine_paid = $2 WHERE id = $3",
            )
            .bind(pay_amount)
            .bind(is_fully_paid)
            .bind(&borrow_id)
            .execute(&pool.pool)
            .await;

            // บันทึก Transaction
            let tx_id = Uuid::new_v4().to_string();
            let _ = sqlx::query("INSERT INTO wallet_transactions (id, user_id, tx_type, amount, description, created_at) VALUES ($1,$2,'fine_payment',$3,$4,$5)")
                .bind(&tx_id)
                .bind(&claims.sub)
                .bind(pay_amount)
                .bind(format!("Automatic Debt Settlement — {} (Paid ฿{:.2})", title, pay_amount))
                .bind(&now)
                .execute(&pool.pool)
                .await;

            current_balance -= pay_amount;
        }
    }

    // ดึงสถานะปัจจุบันมาส่งคืน
    let final_wallet = sqlx::query_as::<_, Wallet>(
        "SELECT id, user_id, balance, updated_at FROM wallets WHERE user_id = $1",
    )
    .bind(&claims.sub)
    .fetch_one(&pool.pool)
    .await
    .unwrap_or(current_wallet);

    HttpResponse::Ok().json(ApiResponse::success(final_wallet))
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
        return HttpResponse::BadRequest()
            .json(ApiResponse::<()>::error("Amount must be greater than 0"));
    }
    if body.amount > 100000.0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "Maximum top-up amount is 100,000 THB",
        ));
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
            .json(ApiResponse::<()>::error("Error processing top-up"));
    }

    // บันทึก transaction
    let tx_id = Uuid::new_v4().to_string();
    let _ = sqlx::query(
        "INSERT INTO wallet_transactions (id, user_id, tx_type, amount, description, created_at) VALUES ($1,$2,'topup',$3,$4,$5)",
    )
    .bind(&tx_id)
    .bind(&claims.sub)
    .bind(body.amount)
    .bind(format!("Top-up ฿{:.2}", body.amount))
    .bind(&now)
    .execute(&pool.pool)
    .await;

    // ดึงยอดใหม่
    let mut current_balance: f64 =
        sqlx::query_scalar("SELECT balance FROM wallets WHERE user_id = $1")
            .bind(&claims.sub)
            .fetch_one(&pool.pool)
            .await
            .unwrap_or(0.0);

    // --- AUTO-PAY PENDING FINES (Support Partial) ---
    let pending_borrows = sqlx::query_as::<_, (String, f64, String)>(
        "SELECT br.id, br.fine_amount, b.title 
         FROM borrows br JOIN books b ON br.book_id = b.id 
         WHERE br.user_id = $1 AND br.fine_paid = FALSE AND br.fine_amount > 0 
         ORDER BY br.borrowed_at ASC",
    )
    .bind(&claims.sub)
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    for (borrow_id, fine, title) in pending_borrows {
        if current_balance <= 0.0 {
            break;
        }

        let pay_amount = if current_balance >= fine {
            fine
        } else {
            current_balance
        };

        // หักเงินลูกหนี้
        let _ = sqlx::query(
            "UPDATE wallets SET balance = balance - $1, updated_at = $2 WHERE user_id = $3",
        )
        .bind(pay_amount)
        .bind(&now)
        .bind(&claims.sub)
        .execute(&pool.pool)
        .await;

        let is_fully_paid = (fine - pay_amount) <= 0.01;
        let _ = sqlx::query(
            "UPDATE borrows SET fine_amount = fine_amount - $1, fine_paid = $2 WHERE id = $3",
        )
        .bind(pay_amount)
        .bind(is_fully_paid)
        .bind(&borrow_id)
        .execute(&pool.pool)
        .await;

        // บันทึก Transaction การชำระหนี้
        let tx_id_fine = Uuid::new_v4().to_string();
        let _ = sqlx::query("INSERT INTO wallet_transactions (id, user_id, tx_type, amount, description, created_at) VALUES ($1,$2,'fine_payment',$3,$4,$5)")
            .bind(&tx_id_fine)
            .bind(&claims.sub)
            .bind(pay_amount)
            .bind(format!("Automated Fine Payment — {} (Paid ฿{:.2})", title, pay_amount))
            .bind(&now)
            .execute(&pool.pool)
            .await;

        current_balance -= pay_amount;

        // Notify that borrow was updated (fine paid)
        hub.broadcast(
            "BORROW_UPDATED",
            serde_json::json!({
                "type": "fine_payment_auto",
                "borrow_id": borrow_id,
                "user_id": claims.sub
            }),
        );
    }

    // ส่งแจ้งเตือน Realtime
    hub.notify_user(
        &claims.sub,
        "WALLET_UPDATED",
        serde_json::json!({
            "balance": current_balance,
            "type": "topup",
            "amount": body.amount
        }),
    );

    HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "balance": current_balance,
        "topped_up": body.amount,
        "message": format!("Top-up successful ฿{:.2} (All debts settled)", body.amount)
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
        None => {
            return HttpResponse::NotFound()
                .json(ApiResponse::<()>::error("Borrow record not found"))
        }
    };

    if fine_paid {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("Fine already paid"));
    }

    if fine_amount <= 0.0 {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("No fine amount to pay"));
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
            "Insufficient wallet balance (Available: ฿{:.2}, Required: ฿{:.2})",
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

    let tx_id = Uuid::new_v4().to_string();
    let title_str = book_title.unwrap_or_else(|| "Book".to_string());
    let _ = sqlx::query(
        "INSERT INTO wallet_transactions (id, user_id, tx_type, amount, description, created_at) VALUES ($1,$2,'fine_payment',$3,$4,$5)",
    )
    .bind(&tx_id)
    .bind(&claims.sub)
    .bind(fine_amount)
    .bind(format!("Fine Payment — {}", title_str))
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
    hub.broadcast(
        "BORROW_UPDATED",
        serde_json::json!({
            "type": "fine_payment",
            "borrow_id": body.borrow_id,
            "user_id": claims.sub
        }),
    );

    HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "paid": fine_amount,
        "new_balance": new_balance,
        "message": format!("Fine payment of ฿{:.2} successful", fine_amount)
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
            .json(ApiResponse::<()>::error("Could not fetch wallet history")),
    }
}
