import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from "@nestjs/common";

import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { UsersService } from "../users/users.service";
import * as crypto from "crypto";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { MailService } from "../mail/mail.service";
@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private usersService: UsersService,
        private configService: ConfigService,
        @InjectRedis() private readonly redis: Redis,
        private mailService: MailService
    ) { }

    async validateGoogleUser(profile: {
        googleId: string;
        email: string;
        name: string;
    }) {
        let user = await this.usersService.findByGoogleId(profile.googleId);
        if (!user) {
            user = await this.usersService.createGoogleUser(profile);
        }
        // Trả về cả user lẫn roles
        const roles = user.role ? [user.role.name] : [];
        return { user, roles };
    }

    async sendSignUpOtp(email: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.usersService.findByEmail(normalizedEmail);
        if (user) {
            throw new BadRequestException("Email đã được đăng ký trong hệ thống");
        }

        // Tạo OTP gồm 6 chữ số ngẫu nhiên
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Lưu OTP vào Redis với TTL là 10 phút (600 giây)
        await this.redis.set(`otp:signup:${normalizedEmail}`, otp, "EX", 600);

        // Gửi email chứa mã OTP
        const sent = await this.mailService.sendSignUpOtpEmail(normalizedEmail, otp);
        if (!sent) {
            throw new BadRequestException("Không thể gửi email xác thực. Vui lòng thử lại sau.");
        }

        return { message: "Mã xác thực đã được gửi đến email của bạn" };
    }

    async signUpEmail(createUserDto: CreateUserDto & { otp?: string }) {
        const normalizedEmail = createUserDto.email.trim().toLowerCase();

        // 1. Kiểm tra OTP đăng ký trước
        const storedOtp = await this.redis.get(`otp:signup:${normalizedEmail}`);
        if (!storedOtp || storedOtp !== createUserDto.otp?.trim()) {
            throw new BadRequestException("Mã xác thực không hợp lệ hoặc đã hết hạn");
        }

        const existingUser = await this.usersService.findByEmail(normalizedEmail);
        if (existingUser) {
            throw new BadRequestException("Email đã được đăng ký");
        }
        createUserDto.email = normalizedEmail;
        createUserDto.full_name = createUserDto.full_name?.trim();
        createUserDto.phone = createUserDto.phone?.trim();

        // Loại bỏ trường otp trước khi lưu DB
        const { otp, ...userFields } = createUserDto;
        const user = await this.usersService.create(userFields);

        // Xóa OTP khỏi Redis sau khi đăng ký thành công
        await this.redis.del(`otp:signup:${normalizedEmail}`);
        
        // Gửi email chào mừng không chặn luồng đăng ký chính
        this.mailService.sendSignUpEmail(user.email, user.full_name).catch(err => {
            console.error('Lỗi gửi mail chào mừng:', err);
        });

        return user;
    }

    async sendForgotPasswordOtp(email: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.usersService.findByEmail(normalizedEmail);
        if (!user) {
            throw new BadRequestException("Email không tồn tại trong hệ thống");
        }

        // Tạo OTP gồm 6 chữ số ngẫu nhiên
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Lưu OTP vào Redis với TTL là 10 phút (600 giây)
        await this.redis.set(`otp:password-reset:${normalizedEmail}`, otp, "EX", 600);

        // Gửi email chứa mã OTP
        const sent = await this.mailService.sendForgotPasswordOtpEmail(normalizedEmail, otp);
        if (!sent) {
            throw new BadRequestException("Không thể gửi email khôi phục mật khẩu. Vui lòng thử lại sau.");
        }

        return { message: "Mã xác thực đã được gửi đến email của bạn" };
    }

    async verifyForgotPasswordOtp(email: string, otp: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const storedOtp = await this.redis.get(`otp:password-reset:${normalizedEmail}`);
        if (!storedOtp || storedOtp !== otp.trim()) {
            throw new BadRequestException("Mã xác thực không hợp lệ hoặc đã hết hạn");
        }
        return { message: "Mã xác thực hợp lệ" };
    }

    async resetPassword(email: string, otp: string, passwordReset: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const storedOtp = await this.redis.get(`otp:password-reset:${normalizedEmail}`);
        if (!storedOtp || storedOtp !== otp.trim()) {
            throw new BadRequestException("Mã xác thực không hợp lệ hoặc đã hết hạn");
        }

        const user = await this.usersService.findByEmail(normalizedEmail);
        if (!user) {
            throw new BadRequestException("Người dùng không tồn tại");
        }

        // Cập nhật mật khẩu mới (usersService.update tự động hash mật khẩu)
        await this.usersService.update(user.id, { password: passwordReset });

        // Xóa OTP khỏi Redis
        await this.redis.del(`otp:password-reset:${normalizedEmail}`);

        return { message: "Đặt lại mật khẩu thành công" };
    }

    async signInEmail(email: string, password: string) {
        const user = await this.usersService.findByEmail(email.trim().toLowerCase());
        // Password undefined = Google user, không cho đăng nhập bằng email
        if (!user || !user.password) {
            throw new UnauthorizedException("Invalid credentials");
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid credentials");
        }
        // Trả về cả user lẫn roles để controller gọi generateTokens
        const roles = user.role ? [user.role.name] : [];
        return { user, roles };
    }
    async generateTokens(userId: string, roles: string[] = []) {
        const accessSecret = this.configService.get("JWT_ACCESS_SECRET");
        const refreshSecret = this.configService.get("JWT_REFRESH_SECRET");

        // Nhúng roles vào access token để RolesGuard đọc được
        const accessToken = this.jwtService.sign(
            { sub: userId, roles },
            { secret: accessSecret, expiresIn: "1d" }
        );
        const refreshToken = this.jwtService.sign(
            { sub: userId },
            { secret: refreshSecret, expiresIn: "7d" }
        );
        // Hash refresh và lưu Redis (TTL 7d, để revoke)
        const refreshHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");
        await this.redis.set(
            `refresh:${userId}`,
            refreshHash,
            "EX",
            7 * 24 * 60 * 60
        );

        return { accessToken, refreshToken };
    }

    async refreshToken(oldRefreshToken: string) {
        try {
            const refreshSecret = this.configService.get("JWT_REFRESH_SECRET");
            const payload = this.jwtService.verify(oldRefreshToken, {
                secret: refreshSecret,
            } as any);
            const user = await this.usersService.findById(payload.sub);
            if (!user) throw new UnauthorizedException();

            const storedHash = await this.redis.get(`refresh:${payload.sub}`);
            const newHash = crypto
                .createHash("sha256")
                .update(oldRefreshToken)
                .digest("hex");
            if (storedHash !== newHash)
                throw new UnauthorizedException("Invalid refresh token");

            return this.generateTokens(payload.sub);
        } catch {
            throw new UnauthorizedException();
        }
    }
    async logout(userId: string) {
        await this.redis.del(`refresh:${userId}`);
    }

    /**
     * Verify an access token and return the user if valid, otherwise null.
     * Controller expects a falsy return on invalid/expired token.
     */
    async verifyAccessToken(token: string) {
        try {
            const accessSecret = this.configService.get("JWT_ACCESS_SECRET");
            const payload = this.jwtService.verify(token, {
                secret: accessSecret,
            } as any);
            const user = await this.usersService.findById(payload.sub);
            return user || null;
        } catch (err) {
            return null;
        }
    }
}
