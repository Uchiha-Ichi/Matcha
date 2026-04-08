import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware log thông tin mỗi request vào server.
 * Ghi lại: method, URL, status code, thời gian xử lý.
 *
 * Áp dụng trong AppModule.configure() để chạy trên tất cả route.
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const startTime = Date.now();

    // Lắng nghe khi response kết thúc để log thời gian xử lý
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} — ${responseTime}ms | IP: ${ip} | UA: ${userAgent}`,
      );
    });

    next();
  }
}
