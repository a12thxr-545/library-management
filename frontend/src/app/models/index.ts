export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  /** SRS roles: student | professor | librarian */
  role: string;
  avatar_url?: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  cover_url?: string;
  category_id?: string;
  category_name?: string;
  publisher?: string;
  published_year?: number;
  total_copies: number;
  available_copies: number;
  /** SRS: available | borrowed | reserved */
  status: string;
  view_count: number;
  borrow_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at: string;
  book_count?: number;
}

export interface Borrow {
  id: string;
  user_id: string;
  username?: string;
  user_full_name?: string;
  book_id: string;
  book_title?: string;
  book_cover?: string;
  reservation_id?: string;
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  /** SRS: ค่าปรับ (บาท) */
  fine_amount: number;
  fine_paid: boolean;
  /** active | returned | overdue */
  status: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  book_id: string;
  book_title?: string;
  book_cover?: string;
  reserved_at: string;
  expires_at: string;
  /** active | cancelled | converted */
  status: string;
}

export interface UserInterest {
  user_id: string;
  category_id: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedBooks {
  books: Book[];
  total: number;
  limit: number;
  offset: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
  full_name?: string;
  phone?: string;
  role?: string;
}

export interface BorrowRequest {
  book_id: string;
  reservation_id?: string;
  due_date?: string;
}
