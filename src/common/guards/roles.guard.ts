import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard kiểm tra role của user có nằm trong danh sách @Roles() cho phép không.
 * Phải kết hợp với JwtAuthGuard để user đã được xác thực trước.
 * 
 * Sử dụng: @UseGuards(JwtAuthGuard, RolesGuard)
 *           @Roles('admin')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách role được phép từ metadata của route hoặc class
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu route không gán @Roles() thì cho qua (chỉ cần JWT hợp lệ)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // user.roles là mảng string từ JWT payload (ví dụ: ['admin', 'user'])
    const userRoles: string[] = user?.roles ?? [];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Tài khoản không có quyền truy cập. Yêu cầu role: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
