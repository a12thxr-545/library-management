use serde::{Deserialize, Serialize};

// ==================== USER ====================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    /// SRS roles: student | professor | librarian
    pub role: String,
    pub avatar_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub role: String,
    pub avatar_url: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: Option<String>,
    pub password: String,
    pub full_name: Option<String>,
    pub phone: Option<String>,
    /// student | professor (librarian only via admin)
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserProfile,
}

// ==================== CATEGORY ====================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub book_count: Option<i64>,
}

// ==================== INTEREST ====================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct UserInterest {
    pub user_id: String,
    pub category_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SetInterestsRequest {
    pub category_ids: Vec<String>,
}

// ==================== BOOK ====================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: String,
    pub isbn: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub category_id: Option<String>,
    #[sqlx(default)]
    pub category_name: Option<String>,
    pub publisher: Option<String>,
    pub published_year: Option<i32>,
    pub total_copies: i32,
    pub available_copies: i32,
    /// SRS status: available | borrowed | reserved
    pub status: String,
    pub view_count: i32,
    pub borrow_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateBookRequest {
    pub title: String,
    pub author: String,
    pub isbn: Option<String>,
    pub description: Option<String>,
    pub cover_url: Option<String>,
    pub category_id: Option<String>,
    pub publisher: Option<String>,
    pub published_year: Option<i64>,
    pub total_copies: Option<i64>,
}

// ==================== RESERVATION (FR-002) ====================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Reservation {
    pub id: String,
    pub user_id: String,
    pub book_id: String,
    #[sqlx(default)]
    pub book_title: Option<String>,
    #[sqlx(default)]
    pub book_cover: Option<String>,
    /// ISO datetime
    pub reserved_at: String,
    /// Reservation expires after 3 days
    pub expires_at: String,
    /// active | cancelled | converted
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct ReservationRequest {
    pub book_id: String,
}

// ==================== BORROW ====================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Borrow {
    pub id: String,
    pub user_id: String,
    #[sqlx(default)]
    pub username: Option<String>,
    #[sqlx(default)]
    pub user_full_name: Option<String>,
    pub book_id: String,
    #[sqlx(default)]
    pub book_title: Option<String>,
    #[sqlx(default)]
    pub book_cover: Option<String>,
    pub reservation_id: Option<String>,
    pub borrowed_at: String,
    pub due_date: String,
    pub returned_at: Option<String>,
    /// SRS: ค่าปรับ (บาท/วัน)
    pub fine_amount: f64,
    pub fine_paid: bool,
    /// active | returned | overdue
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct BorrowRequest {
    pub book_id: String,
    pub reservation_id: Option<String>,
    pub due_date: Option<String>,
}

// ==================== FINE ====================

#[derive(Debug, Serialize)]
pub struct FineInfo {
    pub borrow_id: String,
    pub book_title: Option<String>,
    pub days_overdue: i64,
    pub fine_amount: f64,
    pub fine_paid: bool,
}

// ==================== WALLET ====================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Wallet {
    pub id: String,
    pub user_id: String,
    pub balance: f64,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct WalletTransaction {
    pub id: String,
    pub user_id: String,
    /// topup | fine_payment
    pub tx_type: String,
    pub amount: f64,
    /// description / reference
    pub description: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct TopUpRequest {
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
pub struct PayFineRequest {
    pub borrow_id: String,
}

// ==================== COMMON ====================

#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub message: Option<String>,
    pub data: Option<T>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        ApiResponse {
            success: true,
            message: None,
            data: Some(data),
        }
    }
}

impl ApiResponse<()> {
    pub fn error(msg: &str) -> Self {
        ApiResponse {
            success: false,
            message: Some(msg.to_string()),
            data: None,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct BookQuery {
    pub category: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedBooks {
    pub books: Vec<Book>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub exp: usize,
}

/// Fine rate: 25 บาท/วัน สำหรับ student, 15 บาท/วัน สำหรับ professor
pub fn fine_rate_per_day(role: &str) -> f64 {
    match role {
        "professor" => 15.0,
        _ => 25.0,
    }
}

/// Loan duration in days: student=14, professor=30 (SRS: professor ยืมได้นานกว่า)
pub fn loan_duration_days(role: &str) -> i64 {
    match role {
        "professor" => 30,
        _ => 14,
    }
}
