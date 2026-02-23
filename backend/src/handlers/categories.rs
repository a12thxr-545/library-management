use crate::{db::DbPool, models::*};
use actix_web::{web, HttpResponse};

const BOOK_SELECT: &str = "SELECT b.id, b.title, b.author, b.isbn, b.description, b.cover_url,
     b.category_id, c.name as category_name, b.publisher, b.published_year,
     b.total_copies, b.available_copies, COALESCE(b.status,'available') as status,
     b.view_count, b.borrow_count, b.created_at, b.updated_at
     FROM books b LEFT JOIN categories c ON b.category_id = c.id";

pub async fn get_categories(pool: web::Data<DbPool>) -> HttpResponse {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT c.id, c.name, c.description, c.icon, c.color, c.created_at,
         COUNT(b.id) as book_count FROM categories c
         LEFT JOIN books b ON c.id = b.category_id GROUP BY c.id ORDER BY c.name",
    )
    .fetch_all(&pool.pool)
    .await
    .unwrap_or_default();

    HttpResponse::Ok().json(ApiResponse::success(categories))
}

pub async fn get_books_by_category(
    pool: web::Data<DbPool>,
    path: web::Path<String>,
) -> HttpResponse {
    let category_id = path.into_inner();
    let sql = format!("{} WHERE b.category_id = $1 ORDER BY b.title", BOOK_SELECT);
    let books = sqlx::query_as::<_, Book>(&sql)
        .bind(category_id)
        .fetch_all(&pool.pool)
        .await
        .unwrap_or_default();
    HttpResponse::Ok().json(ApiResponse::success(books))
}
