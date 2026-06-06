import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();

      // Lấy token từ cookie, handshake auth, headers hoặc query string
      const cookieHeader = client.handshake?.headers?.cookie;
      const cookieToken = cookieHeader
        ? cookieHeader.match(/access_token=([^;]+)/)?.[1]
        : null;

      const token =
        cookieToken ||
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake?.query?.token;

      if (!token) {
        throw new WsException('Không tìm thấy token xác thực');
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify(token as string, { secret });

      // Gắn user vào socket để dùng trong handler
      (client as any).user = {
        userId: parseInt(payload.sub, 10),
        roles: (payload.roles ?? []).map((r: string) => r.toLowerCase()),
      };

      return true;
    } catch {
      throw new WsException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
