import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { User } from '../users/entities/user.entity';
import { PartnerConcept } from '../partner-concepts/entities/partner-concept.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { BookingDetail } from '../booking-details/entities/booking-detail.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Partner } from '../partners/entities/partner.entity';

@Injectable()
export class CartsService {
  constructor(private readonly dataSource: DataSource) { }

  // ─── Lấy hoặc tạo mới giỏ hàng ───────────────────────────────────────────

  async getOrCreateCart(userId: number): Promise<Cart> {
    const cartsRepo = this.dataSource.getRepository(Cart);
    let cart = await cartsRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.partner_concept', 'items.partner_concept.partner', 'items.partner_concept.concept'],
    });
    if (!cart) {
      const usersRepo = this.dataSource.getRepository(User);
      const user = await usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(`Không tìm thấy người dùng #${userId}`);
      cart = cartsRepo.create({ user });
      cart = await cartsRepo.save(cart);
      cart.items = [];
    }
    return cart;
  }

  // ─── Xem giỏ hàng ─────────────────────────────────────────────────────────

  async getCart(userId: number): Promise<Cart> {
    return this.getOrCreateCart(userId);
  }

  // ─── Thêm item vào giỏ ────────────────────────────────────────────────────

  async addItem(userId: number, dto: AddCartItemDto): Promise<Cart> {
    const { partner_concept_id, quantity = 1 } = dto;

    const cartItemsRepo = this.dataSource.getRepository(CartItem);
    const partnerConceptsRepo = this.dataSource.getRepository(PartnerConcept);

    // Verify concept exists
    const concept = await partnerConceptsRepo.findOne({
      where: { id: partner_concept_id },
      relations: ['partner'],
    });
    if (!concept) {
      throw new NotFoundException(`Không tìm thấy gói dịch vụ #${partner_concept_id}`);
    }

    const cart = await this.getOrCreateCart(userId);

    // Nếu đã có item với concept này → tăng quantity
    const existingItem = cart.items?.find(
      (item) => item.partner_concept?.id === partner_concept_id,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      await cartItemsRepo.save(existingItem);
    } else {
      const newItem = cartItemsRepo.create({
        cart,
        partner_concept: concept,
        quantity,
      });
      await cartItemsRepo.save(newItem);
    }

    return this.getCart(userId);
  }

  // ─── Cập nhật quantity ────────────────────────────────────────────────────

  async updateItem(userId: number, itemId: number, dto: UpdateCartItemDto): Promise<Cart> {
    const cartItemsRepo = this.dataSource.getRepository(CartItem);

    const item = await cartItemsRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user'],
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy item giỏ hàng #${itemId}`);
    }

    if (item.cart?.user?.id !== userId) {
      throw new BadRequestException('Item này không thuộc giỏ hàng của bạn');
    }

    item.quantity = dto.quantity;
    await cartItemsRepo.save(item);

    return this.getCart(userId);
  }

  // ─── Xóa 1 item ───────────────────────────────────────────────────────────

  async removeItem(userId: number, itemId: number): Promise<Cart> {
    const cartItemsRepo = this.dataSource.getRepository(CartItem);

    const item = await cartItemsRepo.findOne({
      where: { id: itemId },
      relations: ['cart', 'cart.user'],
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy item giỏ hàng #${itemId}`);
    }

    if (item.cart?.user?.id !== userId) {
      throw new BadRequestException('Item này không thuộc giỏ hàng của bạn');
    }

    await cartItemsRepo.delete(itemId);
    return this.getCart(userId);
  }

  // ─── Xóa toàn bộ giỏ ─────────────────────────────────────────────────────

  async clearCart(userId: number): Promise<{ message: string }> {
    const cartsRepo = this.dataSource.getRepository(Cart);
    const cart = await cartsRepo.findOne({
      where: { user: { id: userId } },
    });
    if (cart) {
      await this.dataSource.getRepository(CartItem).delete({ cart: { id: cart.id } });
    }
    return { message: 'Đã xóa toàn bộ giỏ hàng' };
  }

  // ─── Checkout: tạo booking(s) từ giỏ hàng ────────────────────────────────

  async checkout(userId: number, dto: CheckoutCartDto): Promise<Booking[]> {
    const { booking_time, promotion_id } = dto;

    const cart = await this.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng của bạn đang trống');
    }

    // Nhóm items theo partner
    const itemsByPartner = new Map<number, CartItem[]>();
    for (const item of cart.items) {
      const partnerId = item.partner_concept?.partner?.id;
      if (!partnerId) {
        throw new BadRequestException(
          `Gói dịch vụ #${item.partner_concept?.id} không có thông tin partner`,
        );
      }
      if (!itemsByPartner.has(partnerId)) {
        itemsByPartner.set(partnerId, []);
      }
      itemsByPartner.get(partnerId)!.push(item);
    }

    const createdBookings: Booking[] = [];

    // Tạo 1 booking cho mỗi partner
    await this.dataSource.transaction(async (manager) => {
      const usersRepo = manager.getRepository(User);
      const partnersRepo = manager.getRepository(Partner);
      const promotionsRepo = manager.getRepository(Promotion);
      const bookingsRepo = manager.getRepository(Booking);
      const bookingDetailsRepo = manager.getRepository(BookingDetail);
      const paymentsRepo = manager.getRepository(Payment);

      const user = await usersRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException(`Không tìm thấy người dùng #${userId}`);

      // Tải promotion (dùng chung cho tất cả bookings nếu có)
      let promotion: Promotion | undefined;
      if (promotion_id) {
        const foundPromotion = await promotionsRepo.findOne({ where: { id: promotion_id } });
        if (!foundPromotion) {
          throw new NotFoundException(`Không tìm thấy mã khuyến mãi #${promotion_id}`);
        }
        if (!foundPromotion.is_active) {
          throw new BadRequestException(`Khuyến mãi #${promotion_id} hiện đang bị vô hiệu hoá`);
        }
        if (foundPromotion.expired_at && new Date(foundPromotion.expired_at) < new Date()) {
          throw new BadRequestException(`Khuyến mãi #${promotion_id} đã hết hạn sử dụng`);
        }
        promotion = foundPromotion;
      }

      for (const [partnerId, items] of itemsByPartner.entries()) {
        const partner = await partnersRepo.findOne({ where: { id: partnerId } });
        if (!partner) {
          throw new NotFoundException(`Không tìm thấy đối tác #${partnerId}`);
        }

        // Tính tổng giá (có quantity)
        const totalPrice = items.reduce(
          (sum, item) => sum + Number(item.partner_concept!.price) * item.quantity,
          0,
        );

        // Tính discount
        let discountAmount = 0;
        if (promotion) {
          if (promotion.discount_percentage > 0) {
            discountAmount = totalPrice * (promotion.discount_percentage / 100);
          } else if (promotion.discount_amount > 0) {
            discountAmount = Number(promotion.discount_amount);
          }
          if (promotion.max_discount && discountAmount > Number(promotion.max_discount)) {
            discountAmount = Number(promotion.max_discount);
          }
          if (discountAmount > totalPrice) discountAmount = totalPrice;
        }

        const netPrice = totalPrice - discountAmount;
        const depositAmount = parseFloat((netPrice * 0.3).toFixed(2));

        // Tạo Booking
        const booking = bookingsRepo.create({
          user,
          partner,
          promotion,
          price: totalPrice,
          price_discount: discountAmount,
          price_deposit: depositAmount,
          remaining_amount: netPrice,
          booking_time: new Date(booking_time),
          status: BookingStatus.PENDING,
        });
        const savedBooking = await bookingsRepo.save(booking);

        // Tạo BookingDetails (có quantity)
        const details = items.map((item) =>
          bookingDetailsRepo.create({
            booking: savedBooking,
            partner_concept: item.partner_concept,
            price: item.partner_concept!.price,
            quantity: item.quantity,
          }),
        );
        await bookingDetailsRepo.save(details);

        // Tạo Payment ban đầu (UNPAID)
        const payment = paymentsRepo.create({
          booking: savedBooking,
          status: PaymentStatus.UNPAID,
        });
        await paymentsRepo.save(payment);

        createdBookings.push(savedBooking);
      }

      // Xóa giỏ hàng sau khi checkout thành công
      const cartsRepo = manager.getRepository(Cart);
      const cartRecord = await cartsRepo.findOne({ where: { user: { id: userId } } });
      if (cartRecord) {
        await manager.getRepository(CartItem).delete({ cart: { id: cartRecord.id } });
      }
    });

    return createdBookings;
  }
}
