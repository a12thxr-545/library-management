use crate::{db::DbPool, models::*};
use actix_web::{web, HttpResponse};

pub async fn get_members(pool: web::Data<DbPool>) -> HttpResponse {
    let members = sqlx::query_as::<_, UserProfile>(
        "SELECT id, username, email, full_name, phone, address, role, avatar_url, created_at FROM users ORDER BY created_at DESC"
    )
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(ApiResponse::success(members))
}

pub async fn get_member(pool: web::Data<DbPool>, path: web::Path<String>) -> HttpResponse {
    let id = path.into_inner();

    let result = sqlx::query_as::<_, UserProfile>(
        "SELECT id, username, email, full_name, phone, address, role, avatar_url, created_at FROM users WHERE id = $1"
    )
    .bind(&id)
    .fetch_one(&pool.pool)
    .await;

    match result {
        Ok(member) => HttpResponse::Ok().json(ApiResponse::success(member)),
        Err(_) => HttpResponse::NotFound().json(ApiResponse::<()>::error("Member not found")),
    }
}
