import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  /**
   * GET /carts
   * Lấy giỏ hàng hiện tại của user (tự tạo nếu chưa có)
   */
  @Get()
  async getCart(@CurrentUser() currentUser: { userId: number }) {
    return this.cartsService.getCart(currentUser.userId);
  }

  /**
   * POST /carts/items
   * Thêm gói dịch vụ vào giỏ hàng
   */
  @Post('items')
  async addItem(
    @CurrentUser() currentUser: { userId: number },
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartsService.addItem(currentUser.userId, dto);
  }

  /**
   * PATCH /carts/items/:id
   * Cập nhật số lượng item trong giỏ
   */
  @Patch('items/:id')
  async updateItem(
    @CurrentUser() currentUser: { userId: number },
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItem(currentUser.userId, itemId, dto);
  }

  /**
   * DELETE /carts/items/:id
   * Xóa 1 item khỏi giỏ
   */
  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @CurrentUser() currentUser: { userId: number },
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartsService.removeItem(currentUser.userId, itemId);
  }

  /**
   * DELETE /carts
   * Xóa toàn bộ giỏ hàng
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearCart(@CurrentUser() currentUser: { userId: number }) {
    return this.cartsService.clearCart(currentUser.userId);
  }

  /**
   * POST /carts/checkout
   * Thanh toán giỏ hàng → tự động tạo 1 booking / partner
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @CurrentUser() currentUser: { userId: number },
    @Body() dto: CheckoutCartDto,
  ) {
    return this.cartsService.checkout(currentUser.userId, dto);
  }
}
