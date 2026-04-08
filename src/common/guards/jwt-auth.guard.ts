import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard xác thực JWT từ cookie hoặc Authorization header.
 * Dùng strategy 'jwt' đã đăng ký trong JwtStrategy.
 * 
 * Sử dụng: @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
