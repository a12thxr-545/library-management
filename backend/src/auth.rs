use crate::models::Claims;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "library_secret_key_2024_very_secure".to_string())
}

fn jwt_expires_days() -> i64 {
    std::env::var("JWT_EXPIRES_DAYS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(7)
}

pub fn create_token(
    user_id: &str,
    username: &str,
    role: &str,
) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(jwt_expires_days()))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        exp: expiration,
    };

    let secret = jwt_secret();
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
}

pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let secret = jwt_secret();
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}
