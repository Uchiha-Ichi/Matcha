# Matcha Backend

<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

Hệ thống Backend cho dự án **Matcha** — Nền tảng kết nối, đặt lịch chụp ảnh (booking), quản lý concepts và các đối tác dịch vụ nhiếp ảnh (partners). Dự án được phát triển dựa trên framework **NestJS** với cấu trúc module rõ ràng, tối ưu hóa hiệu năng, bảo mật và tích hợp nhiều dịch vụ thông minh.

## 🔗 Liên kết Dự án

* **Frontend Repository (FE):** [Matcha_FE](https://github.com/Uchiha-Ichi/Matcha_FE)
* **Website Sản phẩm (Production):** [https://www.matcha.net.vn/](https://www.matcha.net.vn/)

---

## 🚀 Công nghệ Sử dụng (Tech Stack)

Hệ thống được xây dựng bằng các công nghệ mạnh mẽ và hiện đại:

* **Core Framework:** [NestJS](https://nestjs.com/) (v11.x) - Progressive Node.js framework
* **Language:** TypeScript
* **Database & ORM:** MySQL + [TypeORM](https://typeorm.io/)
* **Caching & Session:** Redis (ioredis + cache-manager)
* **Authentication:** Passport JWT + Google OAuth 2.0 (lưu và xác thực Refresh Token qua Redis)
* **Real-time:** Socket.io (WebSockets) cho hệ thống chat & thông báo
* **Logging:** Pino Logger (`nestjs-pino`, `pino-pretty`)
* **Media Storage:** Cloudinary & AWS S3 SDK
* **Email Service:** SendGrid Mail SDK
* **AI Integration:** Google Gemini API (`@google/genai` & `@google/generative-ai`)
* **Package Manager:** `pnpm`

---

## 📁 Cấu trúc Thư mục Chính (`src/`)

```bash
src/
├── ai/                     # Tích hợp Google Gemini AI
├── auth/                   # Hệ thống xác thực (JWT + Google OAuth)
├── bookings/               # Quản lý đặt lịch (Booking)
├── booking-details/        # Chi tiết đơn đặt lịch
├── carts/                  # Quản lý giỏ hàng
├── categories/             # Phân loại dịch vụ/concept
├── chat/                   # Tính năng chat Real-time (Socket.io)
├── common/                 # Guards, Decorators, Filters, Middleware dùng chung
│   ├── middleware/         # LoggerMiddleware (Pino)
│   ├── guards/             # JwtAuthGuard, RolesGuard
│   ├── filters/            # AllExceptionsFilter (Format lỗi chuẩn)
│   └── decorators/         # @Roles(), @CurrentUser()
├── concepts/               # Các Concept chụp ảnh
├── conversations/          # Quản lý cuộc hội thoại chat
├── date-blocks/            # Quản lý ngày bận/chặn lịch của đối tác (partners)
├── feedbacks/              # Đánh giá, phản hồi từ khách hàng
├── image/                  # Xử lý & upload hình ảnh (S3/Cloudinary)
├── mail/                   # Gửi email qua SendGrid
├── messages/               # Nội dung tin nhắn chi tiết
├── notifications/          # Hệ thống thông báo người dùng
├── partner-concepts/       # Mối liên kết giữa Đối tác và Concept
├── partners/               # Đối tác/Thợ chụp ảnh (Partners)
├── payments/               # Tích hợp cổng thanh toán
├── promotions/             # Mã giảm giá, khuyến mại
├── roles/                  # Phân quyền hệ thống (admin, partner, user)
├── statistics/             # Thống kê báo cáo số liệu cho Admin
├── users/                  # Quản lý tài khoản người dùng
├── app.module.ts           # Root module cấu hình ứng dụng
└── main.ts                 # Điểm khởi chạy hệ thống (Bootstrap)
```

---

## 🛠️ Hướng dẫn Cài đặt & Khởi chạy

### 1. Yêu cầu Hệ thống
* Node.js (phiên bản khuyến nghị: v18 hoặc v20)
* MySQL Server
* Redis Server
* Trình quản lý gói `pnpm` (Nếu chưa cài: `npm install -g pnpm`)

### 2. Cài đặt Dependencies
Di chuyển vào thư mục backend và chạy lệnh sau để cài đặt thư viện:
```bash
pnpm install
```

### 3. Cấu hình Biến môi trường (`.env`)
Tạo file `.env` tại thư mục gốc của backend và điền các cấu hình mẫu sau:
```env
# Server Config
PORT=8000
NODE_ENV=development

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_DATABASE=matcha

# Redis Config
REDIS_URL=redis://localhost:6379

# JWT Security
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Khởi chạy Ứng dụng

* **Chế độ Phát triển (Development):**
  ```bash
  pnpm run start:dev
  ```
  *Ứng dụng sẽ tự động khởi chạy tại cổng `8000` (hoặc cổng được định nghĩa trong `.env`) kèm cơ chế tự động tải lại khi code thay đổi (Hot Reload).*

* **Chế độ Production:**
  ```bash
  pnpm run build
  pnpm run start:prod
  ```

---

## 🔒 Cơ chế Bảo mật & Phân quyền

1. **Xác thực qua JWT & Cookie:**
   * Access Token có hiệu lực ngắn (15 phút), được gửi kèm trong request header hoặc cookie.
   * Refresh Token có hiệu lực dài (7 ngày), lưu an toàn trong httpOnly Cookie và được kiểm tra tính hợp lệ bằng redis hash (Key: `refresh:{userId}`).
2. **Phân quyền Role-based:**
   * Sử dụng decorator `@Roles('admin')`, `@Roles('partner')` để hạn chế quyền truy cập route.
   * Các Guards chạy theo thứ tự bắt buộc: `JwtAuthGuard` ➔ `RolesGuard`.
3. **Log & Exception Handling:**
   * Mọi HTTP request được ghi log chi tiết bởi Pino Logger thông qua `LoggerMiddleware`.
   * Lỗi phát sinh trong ứng dụng được bắt và chuẩn hóa định dạng JSON trả về qua `AllExceptionsFilter` giúp bảo mật stack trace phía máy chủ.

---

## 🤝 Liên hệ & Đóng góp
Dự án được duy trì bởi đội ngũ Matcha. Mọi đóng góp xin vui lòng gửi Pull Request hoặc tạo Issue tại repository tương ứng.

* **Frontend Repo:** [Matcha_FE](https://github.com/Uchiha-Ichi/Matcha_FE)
* **Website:** [www.matcha.net.vn](https://www.matcha.net.vn/)
