import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global Exception Filter — bắt TẤT CẢ lỗi trong app.
 *
 * - HttpException (NotFoundException, ConflictException...): format lại thành JSON chuẩn
 * - Lỗi JS thường (TypeError, DB error...): trả 500, log stack trace
 *
 * Đăng ký trong main.ts: app.useGlobalFilters(new AllExceptionsFilter())
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      // Lỗi NestJS (NotFoundException, ConflictException, UnauthorizedException...)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // getResponse() có thể là string hoặc object { message, error }
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message ?? exception.message;
    } else {
      // Lỗi không mong đợi (DB, TypeError, ...)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      // Log đầy đủ để debug
      this.logger.error(
        `Unhandled exception: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    // Response chuẩn thống nhất cho toàn app
    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
