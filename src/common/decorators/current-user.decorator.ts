import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator lấy thông tin user hiện tại từ request (sau khi JWT đã verify).
 * Ví dụ: @CurrentUser() user: { userId: number; roles: string[] }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
