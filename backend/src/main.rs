mod auth;
mod db;
mod handlers;
mod middleware;
mod models;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use env_logger::Env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(Env::default().default_filter_or("info"));
    dotenv::dotenv().ok();

    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_addr = format!("{}:{}", host, port);

    let pool = db::init_db().await.expect("Failed to initialize database");
    let pool = web::Data::new(pool);

    log::info!("Starting Library Backend on http://{}", bind_addr);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(pool.clone())
            // Auth routes
            .route(
                "/api/auth/register",
                web::post().to(handlers::auth::register),
            )
            .route("/api/auth/login", web::post().to(handlers::auth::login))
            .route("/api/auth/me", web::get().to(handlers::auth::me))
            .route(
                "/api/admin/users",
                web::get().to(handlers::auth::list_users),
            )
            // Book routes
            .route("/api/books", web::get().to(handlers::books::get_books))
            .route("/api/books/{id}", web::get().to(handlers::books::get_book))
            .route("/api/books", web::post().to(handlers::books::create_book))
            .route(
                "/api/books/{id}",
                web::put().to(handlers::books::update_book),
            )
            .route(
                "/api/books/{id}",
                web::delete().to(handlers::books::delete_book),
            )
            .route(
                "/api/books/new/latest",
                web::get().to(handlers::books::get_new_books),
            )
            .route(
                "/api/books/popular/top",
                web::get().to(handlers::books::get_popular_books),
            )
            // Category routes
            .route(
                "/api/categories",
                web::get().to(handlers::categories::get_categories),
            )
            .route(
                "/api/categories/{id}/books",
                web::get().to(handlers::categories::get_books_by_category),
            )
            // Member routes
            .route(
                "/api/members",
                web::get().to(handlers::members::get_members),
            )
            .route(
                "/api/members/{id}",
                web::get().to(handlers::members::get_member),
            )
            // Borrow routes (FR-003: fine calculation on return)
            .route("/api/borrow", web::post().to(handlers::borrow::borrow_book))
            .route(
                "/api/borrow/return/{id}",
                web::put().to(handlers::borrow::return_book),
            )
            .route(
                "/api/borrow/my",
                web::get().to(handlers::borrow::my_borrows),
            )
            .route(
                "/api/borrow/all",
                web::get().to(handlers::borrow::list_all_borrows),
            )
            // Reservation routes (FR-002)
            .route(
                "/api/reservations",
                web::post().to(handlers::reservations::create_reservation),
            )
            .route(
                "/api/reservations/{id}",
                web::delete().to(handlers::reservations::cancel_reservation),
            )
            .route(
                "/api/reservations/my",
                web::get().to(handlers::reservations::my_reservations),
            )
            // Fine routes (FR-003)
            .route(
                "/api/fines/my",
                web::get().to(handlers::reservations::my_fines),
            )
            .route(
                "/api/fines/calculate",
                web::post().to(handlers::reservations::calculate_fines),
            )
            // Interest routes
            .route(
                "/api/interests",
                web::get().to(handlers::interests::get_interests),
            )
            .route(
                "/api/interests",
                web::post().to(handlers::interests::set_interests),
            )
            .route(
                "/api/recommendations",
                web::get().to(handlers::interests::get_recommendations),
            )
    })
    .bind(&bind_addr)?
    .run()
    .await
}
