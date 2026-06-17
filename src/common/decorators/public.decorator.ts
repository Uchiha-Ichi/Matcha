import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Đánh dấu route là public — không yêu cầu JWT token.
 * JwtAuthGuard sẽ kiểm tra metadata này để bỏ qua xác thực.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
