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
@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private usersService: UsersService,
        private configService: ConfigService,
        @InjectRedis() private readonly redis: Redis
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

    async signUpEmail(email: string, password: string) {
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new BadRequestException("Email already in use");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.usersService.createUser(email, hashedPassword);
    }

    async signInEmail(email: string, password: string) {
        const user = await this.usersService.findByEmail(email);
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
            { secret: accessSecret, expiresIn: "15m" }
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
