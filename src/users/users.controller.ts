import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // Áp dụng cho toàn bộ controller
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  /**
   * POST /users — Tạo user mới
   * Chỉ admin mới được tạo user trực tiếp qua API này.
   * (User tự đăng ký thì dùng route /auth/signup)
   */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED) // 201 — tạo mới thành công
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return user;
  }

  /**
   * GET /users — Lấy danh sách tất cả user
   * Chỉ admin mới xem được toàn bộ danh sách.
   */
  @Get()
  @Roles('admin')
  async findAll() {
    const users = await this.usersService.findAll();
    return users;
  }

  /**
   * GET /users/me — Lấy thông tin user đang đăng nhập
   * Mọi user đã login đều dùng được (không cần role cụ thể).
   */
  @Get('me')
  async getMe(@CurrentUser() currentUser: { userId: number; roles: string[] }) {
    const user = await this.usersService.findOne(currentUser.userId);
    return user;
  }

  /**
   * GET /users/:id — Lấy thông tin 1 user theo id
   * Admin xem được tất cả. User thường chỉ nên dùng /users/me.
   */
  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    return user;
  }

  /**
   * PATCH /users/me — User tự cập nhật thông tin của mình
   * Mọi user đã login đều dùng được.
   */
  @Patch('me')
  async updateMe(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Không cho tự đổi role
    const { role_id, is_active, ...safeDto } = updateUserDto;
    const user = await this.usersService.update(currentUser.userId, safeDto);
    return user;
  }

  /**
   * PATCH /users/:id — Cập nhật user theo id
   * Admin cập nhật bất kỳ user nào.
   */
  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, updateUserDto);
    return user;
  }

  /**
   * DELETE /users/:id — Xoá user
   * Chỉ admin.
   */
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK) // 200 — xoá thành công, trả message
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
