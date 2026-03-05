use sqlx::postgres::PgPool;
use std::env;

#[derive(Clone)]
pub struct DbPool {
    pub pool: PgPool,
}

pub async fn init_db() -> Result<DbPool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // Diagnostic Log: Show host and port (masking password)
    if let Ok(url) = url::Url::parse(&database_url) {
        log::info!(
            "Attempting to connect to host: {:?}",
            url.host_str().unwrap_or("unknown")
        );
        log::info!("Using port: {:?}", url.port().unwrap_or(5432));
        log::info!("With username: {:?}", url.username());
    }
    log::info!("Initializing connection pool...");

    use sqlx::postgres::PgConnectOptions;
    use std::str::FromStr;
    let options = PgConnectOptions::from_str(&database_url)?.statement_cache_capacity(0);

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect_with(options)
        .await?;

    log::info!("Checking and updating database schema...");

    // Create tables following SRS schema (PostgreSQL syntax)
    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            phone TEXT,
            address TEXT,
            role TEXT NOT NULL DEFAULT 'student',
            avatar_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    ",
    )
    .execute(&pool)
    .await?;

    // Migration logic for role_check constraint
    // We attempt to drop standard and potential auto-named constraints
    let drop_queries = vec![
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS role_check",
        "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check", // Common Postgres default name
    ];

    for q in drop_queries {
        match sqlx::query(q).execute(&pool).await {
            Ok(_) => log::info!("Migration: Executed '{}'", q),
            Err(e) => log::warn!(
                "Migration: Query '{}' failed (this may be normal): {}",
                q,
                e
            ),
        }
    }

    // Add back the new constraint with 'addmin'
    match sqlx::query("ALTER TABLE users ADD CONSTRAINT role_check CHECK (role IN ('student', 'professor', 'librarian', 'addmin'))").execute(&pool).await {
        Ok(_) => log::info!("Migration: Successfully added updated role_check constraint with 'addmin'"),
        Err(e) => {
            if e.to_string().contains("already exists") {
                log::info!("Migration: role_check constraint already updated.");
            } else {
                log::error!("Migration: Critical failure adding role_check: {}", e);
            }
        }
    }

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color TEXT,
            created_at TEXT NOT NULL
        );
    ",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT,
            description TEXT,
            cover_url TEXT,
            category_id TEXT REFERENCES categories(id),
            publisher TEXT,
            published_year INTEGER,
            total_copies INTEGER NOT NULL DEFAULT 1,
            available_copies INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'available',
            view_count INTEGER NOT NULL DEFAULT 0,
            borrow_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            CONSTRAINT status_check CHECK (status IN ('available', 'borrowed', 'reserved'))
        );
    ",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            book_id TEXT NOT NULL REFERENCES books(id),
            reserved_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            CONSTRAINT res_status_check CHECK (status IN ('active', 'cancelled', 'converted'))
        );
    ",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS borrows (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            book_id TEXT NOT NULL REFERENCES books(id),
            reservation_id TEXT REFERENCES reservations(id),
            borrowed_at TEXT NOT NULL,
            due_date TEXT NOT NULL,
            returned_at TEXT,
            fine_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
            status TEXT NOT NULL DEFAULT 'active',
            CONSTRAINT borrow_status_check CHECK (status IN ('active', 'returned', 'overdue'))
        );
    ",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS user_interests (
            user_id TEXT NOT NULL REFERENCES users(id),
            category_id TEXT NOT NULL REFERENCES categories(id),
            PRIMARY KEY (user_id, category_id)
        );
    ",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS wallet_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            tx_type TEXT NOT NULL,
            amount DOUBLE PRECISION NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
    ",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
            balance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
            updated_at TEXT NOT NULL
        );
    ",
    )
    .execute(&pool)
    .await?;

    // Seed data
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM categories")
        .fetch_one(&pool)
        .await?;

    if count == 0 {
        seed_data(&pool).await?;
    }

    Ok(DbPool { pool })
}

async fn seed_data(pool: &PgPool) -> Result<(), sqlx::Error> {
    let now = chrono::Utc::now().to_rfc3339();

    let categories = vec![
        (
            "cat-1",
            "Fiction",
            "Novels and literature",
            "auto_stories",
            "#6366f1",
        ),
        (
            "cat-2",
            "Science",
            "Science and technology books",
            "science",
            "#06b6d4",
        ),
        (
            "cat-3",
            "History",
            "History and social science books",
            "history_edu",
            "#f59e0b",
        ),
        (
            "cat-4",
            "Business",
            "Business and marketing books",
            "business_center",
            "#10b981",
        ),
        (
            "cat-5",
            "Arts",
            "Arts and design books",
            "palette",
            "#ec4899",
        ),
        (
            "cat-6",
            "Comics",
            "Manga and comics",
            "theater_comedy",
            "#8b5cf6",
        ),
        ("cat-7", "Travel", "Travel guides", "explore", "#f97316"),
        (
            "cat-8",
            "Food",
            "Cookbooks and culinary arts",
            "restaurant",
            "#84cc16",
        ),
    ];

    for (id, name, desc, icon, color) in categories {
        sqlx::query("INSERT INTO categories (id, name, description, icon, color, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING")
            .bind(id)
            .bind(name)
            .bind(desc)
            .bind(icon)
            .bind(color)
            .bind(&now)
            .execute(pool)
            .await?;
    }

    let books = vec![
        (
            "book-1",
            "Harry Potter and the Philosopher's Stone",
            "J.K. Rowling",
            "cat-1",
            "https://covers.openlibrary.org/b/id/10523680-L.jpg",
            "เรื่องราวของแฮร์รี่ พอตเตอร์",
            2001,
            5,
            150,
        ),
        (
            "book-2",
            "A Brief History of Time",
            "Stephen Hawking",
            "cat-2",
            "https://covers.openlibrary.org/b/id/8739161-L.jpg",
            "การสำรวจจักรวาลและทฤษฎีบิ๊กแบง",
            1988,
            3,
            89,
        ),
        (
            "book-3",
            "Sapiens: A Brief History of Humankind",
            "Yuval Noah Harari",
            "cat-3",
            "https://covers.openlibrary.org/b/id/8739181-L.jpg",
            "ประวัติศาสตร์ของมนุษยชาติ",
            2011,
            4,
            234,
        ),
        (
            "book-4",
            "The Lean Startup",
            "Eric Ries",
            "cat-4",
            "https://covers.openlibrary.org/b/id/8739191-L.jpg",
            "วิธีสร้างธุรกิจที่ประสบความสำเร็จ",
            2011,
            2,
            178,
        ),
        (
            "book-5",
            "The Great Gatsby",
            "F. Scott Fitzgerald",
            "cat-1",
            "https://covers.openlibrary.org/b/id/8739201-L.jpg",
            "ความฝันแบบอเมริกันยุค 1920s",
            1925,
            6,
            312,
        ),
        (
            "book-6",
            "Atomic Habits",
            "James Clear",
            "cat-4",
            "https://covers.openlibrary.org/b/id/12547191-L.jpg",
            "วิธีสร้างนิสัยที่ดี",
            2018,
            4,
            445,
        ),
        (
            "book-7",
            "One Piece Vol.1",
            "Eiichiro Oda",
            "cat-6",
            "https://covers.openlibrary.org/b/id/8739211-L.jpg",
            "การผจญภัยของลูฟี่",
            1997,
            8,
            567,
        ),
        (
            "book-8",
            "Steve Jobs",
            "Walter Isaacson",
            "cat-4",
            "https://covers.openlibrary.org/b/id/8739221-L.jpg",
            "ชีวประวัติ Steve Jobs",
            2011,
            3,
            289,
        ),
        (
            "book-9",
            "National Geographic Thailand",
            "Various",
            "cat-7",
            "https://covers.openlibrary.org/b/id/8739231-L.jpg",
            "คู่มือท่องเที่ยวไทย",
            2022,
            2,
            123,
        ),
        (
            "book-10",
            "The Art of Cooking",
            "Julia Child",
            "cat-8",
            "https://covers.openlibrary.org/b/id/8739241-L.jpg",
            "ตำราอาหารฝรั่งเศส",
            1961,
            3,
            198,
        ),
        (
            "book-11",
            "Clean Code",
            "Robert C. Martin",
            "cat-2",
            "https://covers.openlibrary.org/b/id/8739251-L.jpg",
            "การเขียนโค้ดที่ดี",
            2008,
            5,
            334,
        ),
        (
            "book-12",
            "The Hobbit",
            "J.R.R. Tolkien",
            "cat-1",
            "https://covers.openlibrary.org/b/id/8739261-L.jpg",
            "การผจญภัยของบิลโบ",
            1937,
            4,
            421,
        ),
    ];

    for (id, title, author, cat_id, cover, desc, year, copies, borrows) in books {
        sqlx::query("INSERT INTO books (id, title, author, category_id, cover_url, description, published_year, total_copies, available_copies, status, borrow_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 'available', $9, $10, $10) ON CONFLICT DO NOTHING")
            .bind(id)
            .bind(title)
            .bind(author)
            .bind(cat_id)
            .bind(cover)
            .bind(desc)
            .bind(year)
            .bind(copies)
            .bind(borrows)
            .bind(&now)
            .execute(pool)
            .await?;
    }

    Ok(())
}
