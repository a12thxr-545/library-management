use crate::db::DbPool;
use crate::handlers::auth::extract_claims;
use crate::models::{ApiResponse, Book, SetInterestsRequest, UserInterest};
use actix_web::{web, HttpRequest, HttpResponse, Responder};

pub async fn set_interests(
    pool: web::Data<DbPool>,
    req: web::Json<SetInterestsRequest>,
    http_req: HttpRequest,
) -> impl Responder {
    let claims = match extract_claims(&http_req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    // Use a transaction for deletion and insertion
    let mut tx = match pool.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Database error"))
        }
    };

    // Clear existing interests
    if let Err(_) = sqlx::query("DELETE FROM user_interests WHERE user_id = $1")
        .bind(&claims.sub)
        .execute(&mut *tx)
        .await
    {
        return HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Failed to clear interests"));
    }

    // Insert new interests
    for cat_id in &req.category_ids {
        if let Err(_) =
            sqlx::query("INSERT INTO user_interests (user_id, category_id) VALUES ($1, $2)")
                .bind(&claims.sub)
                .bind(cat_id)
                .execute(&mut *tx)
                .await
        {
            return HttpResponse::InternalServerError()
                .json(ApiResponse::<()>::error("Failed to set interests"));
        }
    }

    if let Err(_) = tx.commit().await {
        return HttpResponse::InternalServerError()
            .json(ApiResponse::<()>::error("Failed to commit transaction"));
    }

    HttpResponse::Ok().json(ApiResponse::success(()))
}

pub async fn get_interests(pool: web::Data<DbPool>, http_req: HttpRequest) -> impl Responder {
    let claims = match extract_claims(&http_req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    let results = sqlx::query_as::<_, UserInterest>(
        "SELECT user_id, category_id FROM user_interests WHERE user_id = $1",
    )
    .bind(&claims.sub)
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(ApiResponse::success(results))
}

pub async fn get_recommendations(pool: web::Data<DbPool>, http_req: HttpRequest) -> impl Responder {
    let claims = match extract_claims(&http_req) {
        Some(c) => c,
        None => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error("Unauthorized")),
    };

    // Get books from interested categories
    let mut books = sqlx::query_as::<_, Book>("
        SELECT b.id, b.title, b.author, b.isbn, b.description, b.cover_url, b.category_id, 
               c.name as category_name, b.publisher, b.published_year, b.total_copies, 
               b.available_copies, b.status, b.view_count, b.borrow_count, b.created_at, b.updated_at
        FROM books b
        JOIN categories c ON b.category_id = c.id
        WHERE b.category_id IN (SELECT category_id FROM user_interests WHERE user_id = $1)
        ORDER BY RANDOM()
        LIMIT 10
    ")
    .bind(&claims.sub)
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    // If no interests or no books found in those categories, return popular books
    if books.is_empty() {
        books = sqlx::query_as::<_, Book>("
            SELECT b.id, b.title, b.author, b.isbn, b.description, b.cover_url, b.category_id, 
                   c.name as category_name, b.publisher, b.published_year, b.total_copies, 
                   b.available_copies, b.status, b.view_count, b.borrow_count, b.created_at, b.updated_at
            FROM books b
            JOIN categories c ON b.category_id = c.id
            ORDER BY b.borrow_count DESC
            LIMIT 10
        ")
        .fetch_all(&pool.pool)
        .await
        .unwrap_or_default();
    }

    HttpResponse::Ok().json(ApiResponse::success(books))
}
