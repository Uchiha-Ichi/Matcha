import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) { // 1. Thêm 'private' để NestJS inject được service
    super({
      // 2. Ép kiểu hoặc dùng giá trị mặc định để tránh lỗi 'string | undefined'
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:8000/api/v1/auth/signin/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName } = profile;
    const user = {
      googleId: id,
      email: emails?.[0]?.value, // Sử dụng optional chaining để an toàn hơn
      name: displayName,
      accessToken,
    };
    
    // Trong NestJS Passport, bạn có thể trả về trực tiếp user 
    // thay vì gọi done(null, user) nếu dùng async validate
    return user; 
  }
}