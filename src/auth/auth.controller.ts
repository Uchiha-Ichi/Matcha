import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
class SignUpDto implements CreateUserDto {

  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  full_name!: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0|\+84)(\d{9})$/, { message: 'Số điện thoại không đúng định dạng' })
  phone?: string;

  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải ít nhất 6 ký tự' })
  password!: string;
  @IsOptional()
  @IsInt({ message: 'Vai tro phai la mot so nguyen' })
  @IsIn([1, 2, 3], { message: 'Vai tro khong hop le' })
  role_id?: number;
}


class SignInDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải ít nhất 6 ký tự' })
  password!: string;
}

// Thời gian sống cookie (ms)
const COOKIE_ACCESS_TTL = 15 * 60 * 1000;        // 15 phút
const COOKIE_REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 ngày

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) { }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/signup — Đăng ký bằng email
  // ────────────────────────────────────────────────────────────────
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() dto: SignUpDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.signUpEmail(dto);
    const fullUser = await this.usersService.findOne(user.id);
    const roles = fullUser.role ? [fullUser.role.name] : [];

    const { accessToken, refreshToken } = await this.authService.generateTokens(
      String(user.id),
      roles,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: 'Đăng ký thành công', userId: user.id };
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/signin — Đăng nhập bằng email
  // ────────────────────────────────────────────────────────────────
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto, @Res({ passthrough: true }) res: Response) {
    const { user, roles } = await this.authService.signInEmail(dto.email, dto.password);
    const { accessToken, refreshToken } = await this.authService.generateTokens(
      String(user.id),
      roles,
    );

    this.setAuthCookies(res, accessToken, refreshToken);
    return {
      message: 'Đăng nhập thành công',
      userId: user.id,
      user: user,
      roles,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/refresh — Làm mới access token
  // ────────────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refresh_token'];
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshToken(refreshToken);

    this.setAuthCookies(res, accessToken, newRefreshToken);
    return { message: 'Token đã được làm mới' };
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/logout — Đăng xuất
  // ────────────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() currentUser: { userId: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(String(currentUser.userId));
    this.clearAuthCookies(res);
    return { message: 'Đăng xuất thành công' };
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/auth/me — Kiểm tra token còn hợp lệ không
  // ────────────────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() currentUser: { userId: number; roles: string[] }) {
    return { userId: currentUser.userId, roles: currentUser.roles };
  }

  // ── Helper: gắn token vào httpOnly cookie ──────────────────────
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: COOKIE_ACCESS_TTL,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: COOKIE_REFRESH_TTL,
      path: '/api/v1/auth/refresh', // Chỉ gửi cookie này khi gọi /refresh
    });
  }

  private clearAuthCookies(res: Response): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    res.clearCookie('refresh_token', {
      path: '/api/v1/auth/refresh',
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
  }
}
