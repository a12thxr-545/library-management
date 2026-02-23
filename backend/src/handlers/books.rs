use crate::{db::DbPool, models::*};
use actix_web::{web, HttpResponse};
use uuid::Uuid;

const BOOK_SELECT: &str = "SELECT b.id, b.title, b.author, b.isbn, b.description, b.cover_url,
     b.category_id, c.name as category_name, b.publisher, b.published_year,
     b.total_copies, b.available_copies, COALESCE(b.status,'available') as status,
     b.view_count, b.borrow_count, b.created_at, b.updated_at
     FROM books b LEFT JOIN categories c ON b.category_id = c.id";

pub async fn get_books(pool: web::Data<DbPool>, query: web::Query<BookQuery>) -> HttpResponse {
    let limit = query.limit.unwrap_or(20);
    let offset = query.offset.unwrap_or(0);

    let mut sql = format!("{} WHERE TRUE", BOOK_SELECT);
    let mut search_query = String::new();

    if let Some(ref cat) = query.category {
        sql.push_str(&format!(" AND b.category_id = '{}'", cat));
    }

    if let Some(ref search) = query.search {
        search_query = format!("%{}%", search);
        sql.push_str(" AND (b.title ILIKE $1 OR b.author ILIKE $1)");
    }

    sql.push_str(&format!(
        " ORDER BY b.created_at DESC LIMIT {} OFFSET {}",
        limit, offset
    ));

    let books = if !search_query.is_empty() {
        sqlx::query_as::<_, Book>(&sql)
            .bind(search_query)
            .fetch_all(&pool.pool)
            .await
            .unwrap_or_default()
    } else {
        sqlx::query_as::<_, Book>(&sql)
            .fetch_all(&pool.pool)
            .await
            .unwrap_or_default()
    };

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM books")
        .fetch_one(&pool.pool)
        .await
        .unwrap_or(0);

    HttpResponse::Ok().json(ApiResponse::success(PaginatedBooks {
        books,
        total,
        limit,
        offset,
    }))
}

pub async fn get_book(pool: web::Data<DbPool>, path: web::Path<String>) -> HttpResponse {
    let id = path.into_inner();

    let _ = sqlx::query("UPDATE books SET view_count = view_count + 1 WHERE id = $1")
        .bind(&id)
        .execute(&pool.pool)
        .await;

    let sql = format!("{} WHERE b.id = $1", BOOK_SELECT);
    let result = sqlx::query_as::<_, Book>(&sql)
        .bind(&id)
        .fetch_one(&pool.pool)
        .await;

    match result {
        Ok(book) => HttpResponse::Ok().json(ApiResponse::success(book)),
        Err(_) => HttpResponse::NotFound().json(ApiResponse::<()>::error("Book not found")),
    }
}

pub async fn create_book(
    pool: web::Data<DbPool>,
    req: web::Json<CreateBookRequest>,
) -> HttpResponse {
    let now = chrono::Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let copies = req.total_copies.unwrap_or(1) as i32;

    match sqlx::query(
        "INSERT INTO books (id, title, author, isbn, description, cover_url, category_id, publisher, published_year, total_copies, available_copies, status, view_count, borrow_count, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,'available',0,0,$11,$11)",
    )
    .bind(&id)
    .bind(&req.title)
    .bind(&req.author)
    .bind(&req.isbn)
    .bind(&req.description)
    .bind(&req.cover_url)
    .bind(&req.category_id)
    .bind(&req.publisher)
    .bind(req.published_year.map(|y| y as i32))
    .bind(copies)
    .bind(&now)
    .execute(&pool.pool)
    .await {
        Ok(_) => HttpResponse::Created().json(ApiResponse::success(serde_json::json!({"id": id}))),
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&e.to_string())),
    }
}

pub async fn update_book(
    pool: web::Data<DbPool>,
    path: web::Path<String>,
    req: web::Json<CreateBookRequest>,
) -> HttpResponse {
    let now = chrono::Utc::now().to_rfc3339();
    let id = path.into_inner();

    match sqlx::query(
        "UPDATE books SET title=$2, author=$3, isbn=$4, description=$5, cover_url=$6, category_id=$7, publisher=$8, published_year=$9, updated_at=$10 WHERE id=$1",
    )
    .bind(&id)
    .bind(&req.title)
    .bind(&req.author)
    .bind(&req.isbn)
    .bind(&req.description)
    .bind(&req.cover_url)
    .bind(&req.category_id)
    .bind(&req.publisher)
    .bind(req.published_year.map(|y| y as i32))
    .bind(&now)
    .execute(&pool.pool)
    .await {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"id": id}))),
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&e.to_string())),
    }
}

pub async fn delete_book(pool: web::Data<DbPool>, path: web::Path<String>) -> HttpResponse {
    let id = path.into_inner();
    match sqlx::query("DELETE FROM books WHERE id = $1")
        .bind(&id)
        .execute(&pool.pool)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({"deleted": id}))),
        Err(e) => {
            HttpResponse::InternalServerError().json(ApiResponse::<()>::error(&e.to_string()))
        }
    }
}

pub async fn get_new_books(pool: web::Data<DbPool>) -> HttpResponse {
    let sql = format!("{} ORDER BY b.created_at DESC LIMIT 8", BOOK_SELECT);
    let books = sqlx::query_as::<_, Book>(&sql)
        .fetch_all(&pool.pool)
        .await
        .unwrap_or_default();
    HttpResponse::Ok().json(ApiResponse::success(books))
}

pub async fn get_popular_books(pool: web::Data<DbPool>) -> HttpResponse {
    let sql = format!("{} ORDER BY b.borrow_count DESC LIMIT 8", BOOK_SELECT);
    let books = sqlx::query_as::<_, Book>(&sql)
        .fetch_all(&pool.pool)
        .await
        .unwrap_or_default();
    HttpResponse::Ok().json(ApiResponse::success(books))
}
