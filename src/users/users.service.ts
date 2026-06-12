import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) { }

  // ─── CREATE ────────────────────────────────────────────────────────────────

  /** Tạo user thông thường (qua API admin) */
  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const hashed = await bcrypt.hash(dto.password!, 10);
    const user = this.usersRepository.create({
      ...dto,
      password: hashed,
      // role: { id: 1 } as any,
      role: dto.role_id ? ({ id: dto.role_id } as any) : undefined,
    });

    const saved = await this.usersRepository.save(user);
    const { password, ...result } = saved;
    return result;
  }

  /** Dùng bởi AuthService khi đăng ký email/password */
  async createUser(email: string, hashedPassword: string): Promise<User> {
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      full_name: email.split('@')[0],
      role: { id: 1 } as any,
    });
    return this.usersRepository.save(user);
  }

  /** Dùng bởi AuthService khi đăng nhập Google lần đầu */
  async createGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<User> {
    const user = this.usersRepository.create({
      google_id: profile.googleId,
      email: profile.email,
      full_name: profile.name,
      // password để undefined — Google user không có password
    });
    return this.usersRepository.save(user);
  }

  // ─── READ ──────────────────────────────────────────────────────────────────

  /** Lấy tất cả user kèm role (admin only) */
  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['role'],
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        is_active: true,
        avatar_src: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /** Lấy 1 user theo id, kèm relation role — throw 404 nếu không có */
  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user #${id}`);
    }
    return user;
  }

  /**
   * Dùng bởi AuthService — load kèm role để lấy role.name cho JWT.
   * Trả null nếu không tìm thấy (không throw).
   */
  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  /**
   * Dùng bởi AuthService signInEmail — load kèm role.
   * Trả null nếu không tìm thấy (không throw).
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  /**
   * Dùng bởi AuthService validateGoogleUser — tìm theo google_id.
   * Trả null nếu không tìm thấy (không throw).
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { google_id: googleId },
      relations: ['role'],
    });
  }

  async linkGoogleId(id: number, googleId: string): Promise<User> {
    const user = await this.findOne(id);
    user.google_id = googleId;
    return this.usersRepository.save(user);
  }

  // ─── UPDATE ────────────────────────────────────────────────────────────────

  /** Cập nhật thông tin user — hash lại password nếu có */
  async update(id: number, dto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.findOne(id);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.usersRepository.save({
      ...user,
      ...dto,
      role: dto.role_id ? ({ id: dto.role_id } as any) : user.role,
    });

    const { password, ...result } = updated;
    return result;
  }

  // ─── DELETE ────────────────────────────────────────────────────────────────

  /** Hard delete */
  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { message: `Đã xoá user #${id}` };
  }

  /** Vô hiệu hoá user (không xoá khỏi DB) */
  async deactivate(id: number): Promise<Omit<User, 'password'>> {
    return this.update(id, { is_active: false });
  }
}
