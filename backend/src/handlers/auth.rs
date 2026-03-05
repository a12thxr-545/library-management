use crate::{auth, db::DbPool, models::*, realtime::Hub};
use actix_web::{web, HttpRequest, HttpResponse};
use bcrypt::{hash, verify, DEFAULT_COST};
use std::sync::Arc;
use uuid::Uuid;

pub async fn register(pool: web::Data<DbPool>, req: web::Json<RegisterRequest>) -> HttpResponse {
    let now = chrono::Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    // SRS roles: student | professor | librarian (librarian only via admin)
    let role = match req.role.as_deref() {
        Some("professor") => "professor",
        _ => "student",
    };

    // email is optional — auto-generate if not provided
    let email = req
        .email
        .as_deref()
        .filter(|e| !e.is_empty())
        .map(|e| e.to_string())
        .unwrap_or_else(|| format!("{}@library.local", req.username));

    let password_hash = match hash(&req.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Failed to hash password"))
        }
    };

    match sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, full_name, phone, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)",
    )
    .bind(&id)
    .bind(&req.username)
    .bind(&email)
    .bind(&password_hash)
    .bind(&req.full_name)
    .bind(&req.phone)
    .bind(role)
    .bind(&now)
    .execute(&pool.pool)
    .await {
        Ok(_) => {
            let token = crate::auth::create_token(&id, &req.username, role).unwrap_or_default();
            let user = UserProfile {
                id,
                username: req.username.clone(),
                email: email.clone(),
                full_name: req.full_name.clone(),
                phone: req.phone.clone(),
                address: None,
                role: role.to_string(),
                avatar_url: None,
                balance: 0.0,
                created_at: now,
            };
            HttpResponse::Created().json(ApiResponse::success(AuthResponse { token, user }))
        }
        Err(e) => {
            log::error!("Registration database error: {}", e);
            let err_msg = e.to_string();
            if err_msg.contains("UNIQUE") {
                HttpResponse::Conflict().json(ApiResponse::<()>::error("Username or email already exists"))
            } else {
                HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&format!("Registration failed: {}", err_msg)))
            }
        }
    }
}

pub async fn login(pool: web::Data<DbPool>, req: web::Json<LoginRequest>) -> HttpResponse {
    let result = sqlx::query_as::<_, User>(
        "SELECT id, username, email, password_hash, full_name, phone, address, role, avatar_url, created_at, updated_at FROM users WHERE username = $1",
    )
    .bind(&req.username)
    .fetch_one(&pool.pool)
    .await;

    match result {
        Ok(user) => {
            if verify(&req.password, &user.password_hash).unwrap_or(false) {
                let token =
                    auth::create_token(&user.id, &user.username, &user.role).unwrap_or_default();
                let profile = UserProfile {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    address: user.address,
                    role: user.role,
                    avatar_url: user.avatar_url,
                    balance: 0.0,
                    created_at: user.created_at,
                };
                HttpResponse::Ok().json(ApiResponse::success(AuthResponse {
                    token,
                    user: profile,
                }))
            } else {
                HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Invalid credentials"))
            }
        }
        Err(_) => {
            HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Invalid credentials"))
        }
    }
}

pub async fn me(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let result = sqlx::query_as::<_, UserProfile>(
        "SELECT id, username, email, full_name, phone, address, role, avatar_url, created_at FROM users WHERE id = $1",
    )
    .bind(&claims.sub)
    .fetch_one(&pool.pool)
    .await;

    match result {
        Ok(user) => HttpResponse::Ok().json(ApiResponse::success(user)),
        Err(_) => HttpResponse::NotFound().json(ApiResponse::<()>::error("User not found")),
    }
}

pub fn extract_claims(req: &HttpRequest) -> Option<crate::models::Claims> {
    let token = if let Some(auth_header) = req.headers().get("Authorization") {
        let auth_str = auth_header.to_str().ok()?;
        if !auth_str.starts_with("Bearer ") {
            return None;
        }
        auth_str[7..].to_string()
    } else {
        // Fallback to query param (useful for WebSockets)
        let query = req.query_string();
        let params: Vec<(String, String)> = serde_urlencoded::from_str(query).ok()?;
        params
            .iter()
            .find(|(k, _)| k == "token")
            .map(|(_, v)| v.clone())?
    };

    crate::auth::verify_token(&token).ok()
}

pub async fn list_users(pool: web::Data<DbPool>, req: HttpRequest) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    // Check role from DB to support real-time updates
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

    match sqlx::query_as::<_, UserProfile>(
        "SELECT u.id, u.username, u.email, u.full_name, u.phone, u.address, u.role, u.avatar_url, u.created_at, COALESCE(w.balance, 0.0) as balance 
         FROM users u LEFT JOIN wallets w ON u.id = w.user_id 
         ORDER BY u.created_at DESC"
    )
    .fetch_all(&pool.pool)
    .await {
        Ok(users) => HttpResponse::Ok().json(ApiResponse::success(users)),
        Err(e) => {
            log::error!("Failed to fetch members: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error("Database error"))
        }
    }
}

pub async fn update_user_role(
    pool: web::Data<DbPool>,
    hub: web::Data<Arc<Hub>>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<UpdateRoleRequest>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    // Check role from DB
    let db_role: String = match sqlx::query_scalar("SELECT role FROM users WHERE id = $1")
        .bind(&claims.sub)
        .fetch_one(&pool.pool)
        .await
    {
        Ok(r) => r,
        Err(_) => return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Forbidden")),
    };

    if db_role != "addmin" {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Forbidden: Admin only"));
    }

    let user_id = path.into_inner();
    let now = chrono::Utc::now().to_rfc3339();

    // Update role
    match sqlx::query("UPDATE users SET role = $1, updated_at = $2 WHERE id = $3")
        .bind(&body.role)
        .bind(&now)
        .bind(&user_id)
        .execute(&pool.pool)
        .await
    {
        Ok(_) => {
            // Realtime notification
            hub.broadcast(
                "USER_UPDATED",
                serde_json::json!({
                    "user_id": user_id,
                    "new_role": body.role
                }),
            );

            HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
                "user_id": user_id,
                "new_role": body.role,
                "message": "User role updated successfully"
            })))
        }
        Err(e) => {
            log::error!("Failed to update user role: {}", e);
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&format!(
                "Failed to update role: {}",
                e
            )))
        }
    }
}

pub async fn send_notification(
    pool: web::Data<DbPool>,
    hub: web::Data<Arc<Hub>>,
    req: HttpRequest,
    body: web::Json<NotificationRequest>,
) -> HttpResponse {
    let claims = match extract_claims(&req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    // Check if requester is staff/admin
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

    // Send real-time notification
    hub.notify_user(
        &body.user_id,
        "ADMIN_NOTIFICATION",
        serde_json::json!({
            "message": body.message,
            "is_key": body.is_key,
            "sender": claims.username
        }),
    );

    HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "message": "Notification sent successfully"
    })))
}
