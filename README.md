# Library System

ระบบจัดการห้องสมุดดิจิทัล — Backend ด้วย Rust, Frontend ด้วย Angular

## โครงสร้างโปรเจกต์

```
library2/
├── backend/          # Rust + Actix-web API
│   ├── src/
│   │   ├── main.rs           # Entry point + routes
│   │   ├── db.rs             # SQLite init + seed data
│   │   ├── models.rs         # Data structs
│   │   ├── auth.rs           # JWT utils
│   │   ├── middleware.rs
│   │   └── handlers/
│   │       ├── auth.rs       # Login, Register, Me
│   │       ├── books.rs      # CRUD + New/Popular
│   │       ├── categories.rs # หมวดหมู่
│   │       ├── members.rs    # ข้อมูลสมาชิก
│   │       └── borrow.rs     # ยืม/คืน
│   └── Cargo.toml
│
├── frontend/         # Angular 19
│   ├── src/app/
│   │   ├── models/           # TypeScript interfaces
│   │   ├── services/         # Auth, Book, Category services
│   │   ├── guards/           # Auth guard
│   │   ├── interceptors/     # JWT interceptor
│   │   ├── components/
│   │   │   └── shared/navbar/
│   │   └── pages/
│   │       ├── login/        # หน้าเข้าสู่ระบบ
│   │       ├── register/     # หน้าสมัครสมาชิก
│   │       ├── home/         # หน้าแรก
│   │       ├── books/        # รายการหนังสือ
│   │       ├── book-detail/  # รายละเอียดหนังสือ + ยืม/คืน
│   │       ├── categories/   # หมวดหมู่
│   │       └── profile/      # โปรไฟล์ + ประวัติยืม
│   └── package.json
│
└── start.sh          # Script เริ่มต้นทุกอย่าง
```

## การรัน

### วิธีที่ 1: รันทีเดียว
```bash
chmod +x start.sh && ./start.sh
```

### วิธีที่ 2: รันแยก
```bash
# Terminal 1 - Backend
cd backend && cargo run

# Terminal 2 - Frontend  
cd frontend && npx ng serve
```

## API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|---------|
| POST | /api/auth/register | สมัครสมาชิก |
| POST | /api/auth/login | เข้าสู่ระบบ |
| GET | /api/auth/me | ข้อมูลผู้ใช้ปัจจุบัน |
| GET | /api/books | รายการหนังสือ (filter, search, pagination) |
| GET | /api/books/:id | รายละเอียดหนังสือ |
| GET | /api/books/new/latest | หนังสือใหม่ล่าสุด |
| GET | /api/books/popular/top | หนังสือยอดนิยม |
| POST | /api/books | เพิ่มหนังสือ |
| GET | /api/categories | รายการหมวดหมู่ |
| GET | /api/categories/:id/books | หนังสือในหมวดหมู่ |
| GET | /api/members | รายชื่อสมาชิก |
| POST | /api/borrow | ยืมหนังสือ |
| PUT | /api/borrow/return/:id | คืนหนังสือ |
| GET | /api/borrow/my | ประวัติการยืมของฉัน |

## Tech Stack

- **Backend**: Rust, Actix-web 4, SQLite (rusqlite), JWT, bcrypt
- **Frontend**: Angular 19, TypeScript, Vanilla CSS (dark theme)
- **Database**: SQLite (library.db) — ไม่ต้องติดตั้ง DB แยก
