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
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
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

  @IsString()
  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  @MinLength(6, { message: 'Mã xác thực phải gồm 6 ký tự' })
  otp!: string;
}

class SendSignUpOtpDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;
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

class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;
}

class VerifyOtpDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  @MinLength(6, { message: 'Mã xác thực phải gồm 6 ký tự' })
  otp!: string;
}

class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mã xác thực không được để trống' })
  @MinLength(6, { message: 'Mã xác thực phải gồm 6 ký tự' })
  otp!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu mới phải ít nhất 6 ký tự' })
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
    private readonly configService: ConfigService,
  ) { }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/signup/send-otp — Gửi mã xác thực đăng ký
  // ────────────────────────────────────────────────────────────────
  @Post('signup/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendSignUpOtp(@Body() dto: SendSignUpOtpDto) {
    return this.authService.sendSignUpOtp(dto.email);
  }

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
    return { message: 'Đăng ký thành công', userId: user.id, accessToken, refreshToken };
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
      accessToken,
      refreshToken,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/auth/signin/google — Đăng nhập Google
  // ────────────────────────────────────────────────────────────────
  @Get('signin/google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirects to Google
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/auth/signin/google/callback — Google OAuth Callback
  // ────────────────────────────────────────────────────────────────
  @Get('signin/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const { user, roles } = await this.authService.validateGoogleUser(req.user);
    const { accessToken, refreshToken } = await this.authService.generateTokens(
      String(user.id),
      roles,
    );

    this.setAuthCookies(res, accessToken, refreshToken);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/login?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/refresh — Làm mới access token
  // ────────────────────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    let refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        refreshToken = authHeader.substring(7);
      }
    }
    if (!refreshToken && req.body && req.body.refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshToken(refreshToken);

    this.setAuthCookies(res, accessToken, newRefreshToken);
    return { message: 'Token đã được làm mới', accessToken, refreshToken: newRefreshToken };
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

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/forgot-password — Gửi OTP đặt lại mật khẩu
  // ────────────────────────────────────────────────────────────────
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendForgotPasswordOtp(dto.email);
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/verify-otp — Xác thực mã OTP
  // ────────────────────────────────────────────────────────────────
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyForgotPasswordOtp(dto.email, dto.otp);
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/auth/reset-password — Đặt lại mật khẩu mới
  // ────────────────────────────────────────────────────────────────
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.password);
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
