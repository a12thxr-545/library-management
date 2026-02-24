-- Database Schema for Library Management System
-- Database: PostgreSQL

-- 1. Users table (Students, Professors, Librarians)
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
    updated_at TEXT NOT NULL,
    CONSTRAINT role_check CHECK (role IN ('student', 'professor', 'librarian'))
);

-- 2. Categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at TEXT NOT NULL
);

-- 3. Books table
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

-- 4. Reservations table (Waitlist support)
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    book_id TEXT NOT NULL REFERENCES books(id),
    reserved_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT res_status_check CHECK (status IN ('active', 'waiting', 'cancelled', 'converted'))
);

-- 5. Borrows table (Loan records and Fines)
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

-- 6. User Interests table (For Recommendations)
CREATE TABLE IF NOT EXISTS user_interests (
    user_id TEXT NOT NULL REFERENCES users(id),
    category_id TEXT NOT NULL REFERENCES categories(id),
    PRIMARY KEY (user_id, category_id)
);
