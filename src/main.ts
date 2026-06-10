import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // ── 1. Logger (Pino) ─────────────────────────────────────────────────────
  // Dùng Pino thay logger mặc định của NestJS
  app.useLogger(app.get(Logger));

  // ── 2. Helmet ─────────────────────────────────────────────────────────────
  // Tự động thêm các HTTP security headers (chống XSS, clickjacking...)
  app.use(helmet());

  // ── 3. Cookie Parser ──────────────────────────────────────────────────────
  // Parse cookie từ request để JwtStrategy đọc được access_token trong cookie
  app.use(cookieParser());

  // ── 4. CORS ───────────────────────────────────────────────────────────────
  // Cho phép frontend (Next.js) gọi API — chỉ nhận request từ origin được khai báo
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      'https://matcha.net.vn',
      'https://www.matcha.net.vn',
      'https://matcha-fe-2uwg.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean), // Lọc bỏ undefined/null nếu FRONTEND_URL chưa được set
    credentials: true,         // Bắt buộc true khi dùng cookie
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── 5. Global Prefix ──────────────────────────────────────────────────────
  // Tất cả route sẽ bắt đầu bằng /api/v1 (ví dụ: /api/v1/users)
  app.setGlobalPrefix('api/v1');

  // ── 6. Validation Pipe ────────────────────────────────────────────────────
  // Tự động validate DTO theo class-validator, strip các field không khai báo
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Xoá field thừa không có trong DTO
      forbidNonWhitelisted: true, // Throw lỗi nếu có field lạ trong body
      transform: true,            // Tự cast kiểu (string '5' → number 5)
    }),
  );

  // ── 7. Global Exception Filter ───────────────────────────────────────────
  // Bắt tất cả exception, format response lỗi thống nhất toàn app
  app.useGlobalFilters(new AllExceptionsFilter());


  const port = process.env.PORT ?? 8000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
