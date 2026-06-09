import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { DataSource } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingDetail } from '../booking-details/entities/booking-detail.entity';
import { User } from '../users/entities/user.entity';
import { Partner } from '../partners/entities/partner.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { PartnerConcept } from '../partner-concepts/entities/partner-concept.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { DateBlock } from '../date-blocks/entities/date-block.entity';

@Injectable()
export class BookingsService {
  constructor(private readonly dataSource: DataSource) { }

  private parseDurationMinutes(value?: string): number {
    if (!value) return 0;
    const text = String(value).toLowerCase().replace(',', '.');
    const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(h|giờ|gio|hour)/);
    const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(m|phút|phut|min)/);

    if (hourMatch) return Math.round(Number(hourMatch[1]) * 60);
    if (minuteMatch) return Math.round(Number(minuteMatch[1]));

    const numberOnly = Number(text.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
    return numberOnly > 0 ? Math.round(numberOnly * 60) : 0;
  }

  private timeToMinutes(value?: string): number | null {
    if (!value) return null;
    const [hours, minutes] = String(value).split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  private rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
    return startA < endB && endA > startB;
  }

  async create(userId: number, createBookingDto: CreateBookingDto): Promise<Booking> {
    const { partner_id, booking_time, promotion_id, partner_concept_ids } = createBookingDto;

    return await this.dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const partnersRepository = manager.getRepository(Partner);
      const promotionsRepository = manager.getRepository(Promotion);
      const partnerConceptsRepository = manager.getRepository(PartnerConcept);
      const bookingsRepository = manager.getRepository(Booking);
      const bookingDetailsRepository = manager.getRepository(BookingDetail);

      // 1. Verify User
      const user = await usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy người dùng #${userId}`);
      }

      // 2. Verify Partner
      const partner = await partnersRepository.findOne({ where: { id: partner_id } });
      if (!partner) {
        throw new NotFoundException(`Không tìm thấy đối tác (Partner) #${partner_id}`);
      }

      // Check DateBlock conflicts
      const requestedDate = new Date(booking_time);
      const tzOptions = { timeZone: 'Asia/Ho_Chi_Minh' };
      const dateString = requestedDate.toLocaleDateString('sv-SE', tzOptions);
      const timeString = requestedDate.toLocaleTimeString('en-GB', tzOptions);

      const dateBlocksRepository = manager.getRepository(DateBlock);
      const blocksOnDate = await dateBlocksRepository.find({
        where: {
          partner: { id: partner_id },
          date_block: dateString,
        }
      });

      for (const block of blocksOnDate) {
        // If whole-day block
        if (!block.start_time || !block.end_time) {
          throw new BadRequestException(`Đối tác đã chặn lịch vào ngày ${dateString}`);
        }

        // If time-range block matches the requested time
        if (timeString >= block.start_time && timeString <= block.end_time) {
          throw new BadRequestException(
            `Thời gian đặt lịch (${timeString.slice(0, 5)}) ngày ${dateString} nằm trong khung giờ đã bị chặn của đối tác (${block.start_time.slice(0, 5)} - ${block.end_time.slice(0, 5)})`
          );
        }
      }

      // 3. Verify PartnerConcepts
      const partnerConcepts = await partnerConceptsRepository.find({
        where: partner_concept_ids.map(id => ({ id })),
        relations: ['partner']
      });

      if (partnerConcepts.length !== partner_concept_ids.length) {
        throw new NotFoundException('Một hoặc nhiều Concept không tìm thấy');
      }

      // Check if all selected concepts belong to the requested partner
      for (const concept of partnerConcepts) {
        if (concept.partner.id !== partner_id) {
          throw new BadRequestException(
            `Concept #${concept.id} không thuộc về đối tác #${partner_id}`
          );
        }
      }

      const requestedStartMinutes = this.timeToMinutes(timeString);
      const totalDurationMinutes = partnerConcepts.reduce(
        (sum, concept) => sum + this.parseDurationMinutes(concept.time),
        0
      );
      const requestedEndMinutes = requestedStartMinutes !== null && totalDurationMinutes > 0
        ? requestedStartMinutes + totalDurationMinutes
        : requestedStartMinutes;

      for (const block of blocksOnDate) {
        if (!block.start_time || !block.end_time) {
          continue;
        }

        const blockStartMinutes = this.timeToMinutes(block.start_time);
        const blockEndMinutes = this.timeToMinutes(block.end_time);
        if (
          requestedStartMinutes === null ||
          requestedEndMinutes === null ||
          blockStartMinutes === null ||
          blockEndMinutes === null
        ) {
          continue;
        }

        const hasConflict = totalDurationMinutes > 0
          ? this.rangesOverlap(requestedStartMinutes, requestedEndMinutes, blockStartMinutes, blockEndMinutes)
          : requestedStartMinutes >= blockStartMinutes && requestedStartMinutes <= blockEndMinutes;

        if (hasConflict) {
          const requestedEndTime = `${String(Math.floor((requestedEndMinutes / 60) % 24)).padStart(2, '0')}:${String(requestedEndMinutes % 60).padStart(2, '0')}`;
          throw new BadRequestException(
            `Thá»i gian Ä‘áº·t lá»‹ch (${timeString.slice(0, 5)}${totalDurationMinutes > 0 ? ` - ${requestedEndTime}` : ''}) ngÃ y ${dateString} trÃ¹ng khung giá» Ä‘Ã£ bá»‹ cháº·n cá»§a Ä‘á»‘i tÃ¡c (${block.start_time.slice(0, 5)} - ${block.end_time.slice(0, 5)})`
          );
        }
      }

      // 4. Calculate total price
      const totalPrice = partnerConcepts.reduce((sum, pc) => sum + Number(pc.price), 0);

      // 5. Apply Promotion if exists
      let discountAmount = 0;
      let promotion: Promotion | undefined = undefined;

      if (promotion_id) {
        const foundPromotion = await promotionsRepository.findOne({ where: { id: promotion_id } });
        if (!foundPromotion) {
          throw new NotFoundException(`Không tìm thấy mã khuyến mãi #${promotion_id}`);
        }
        promotion = foundPromotion;

        if (!promotion.is_active) {
          throw new BadRequestException(`Khuyến mãi #${promotion_id} hiện tại đang bị vô hiệu hoá`);
        }

        if (promotion.expired_at && new Date(promotion.expired_at) < new Date()) {
          throw new BadRequestException(`Khuyến mãi #${promotion_id} đã hết hạn sử dụng`);
        }

        // Calculate discount
        if (promotion.discount_percentage > 0) {
          discountAmount = totalPrice * (promotion.discount_percentage / 100);
        } else if (promotion.discount_amount > 0) {
          discountAmount = Number(promotion.discount_amount);
        }

        // Cap maximum discount
        if (promotion.max_discount && discountAmount > Number(promotion.max_discount)) {
          discountAmount = Number(promotion.max_discount);
        }

        // Ensure discount doesn't exceed total price
        if (discountAmount > totalPrice) {
          discountAmount = totalPrice;
        }
      }

      const netPrice = totalPrice - discountAmount;

      // 6. Calculate deposit and remaining amount (deposit is 30% of total)
      const depositAmount = parseFloat((netPrice * 0.3).toFixed(2));

      // 7. Save Booking
      const booking = bookingsRepository.create({
        user,
        partner,
        promotion,
        price: totalPrice,
        price_discount: discountAmount,
        price_deposit: depositAmount,
        remaining_amount: netPrice,
        booking_time: new Date(booking_time),
      });

      const savedBooking = await bookingsRepository.save(booking);

      // 8. Save BookingDetails
      const bookingDetails = partnerConcepts.map((pc) => {
        return bookingDetailsRepository.create({
          booking: savedBooking,
          partner_concept: pc,
          price: pc.price,
          quantity: 1,
        });
      });

      await bookingDetailsRepository.save(bookingDetails);

      // 9. Save initial unpaid Payment record
      const paymentRepository = manager.getRepository(Payment);
      const payment = paymentRepository.create({
        booking: savedBooking,
        status: PaymentStatus.UNPAID,
      });
      await paymentRepository.save(payment);

      // Return fully populated booking
      return savedBooking;
    });
  }

  async findAll(userId: number, roles: string[], roleFilter?: string): Promise<Booking[]> {
    const query = this.dataSource.getRepository(Booking).createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.partner', 'partner')
      .leftJoinAndSelect('booking.promotion', 'promotion')
      .leftJoinAndSelect('booking.payments', 'payments')
      .leftJoinAndSelect('booking.details', 'details')
      .leftJoinAndSelect('details.partner_concept', 'partner_concept')
      .leftJoinAndSelect('partner_concept.concept', 'concept');

    // Role-based visibility
    if (roleFilter === 'customer') {
      query.andWhere('booking.user = :userId', { userId });
    } else if (roleFilter === 'partner') {
      query.andWhere('partner.user = :userId', { userId });
    } else if (roles.includes('admin')) {
      // Admin sees everything
    } else if (roles.includes('partner')) {
      // Partner sees bookings made with them
      query.andWhere('partner.user = :userId', { userId });
    } else {
      // Customers see bookings they created
      query.andWhere('booking.user = :userId', { userId });
    }

    return query.getMany();
  }

  async findOne(id: number, userId: number, roles: string[]): Promise<Booking> {
    const query = this.dataSource.getRepository(Booking).createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.partner', 'partner')
      .leftJoinAndSelect('booking.promotion', 'promotion')
      .leftJoinAndSelect('booking.payments', 'payments')
      .leftJoinAndSelect('booking.details', 'details')
      .leftJoinAndSelect('details.partner_concept', 'partner_concept')
      .leftJoinAndSelect('partner_concept.concept', 'concept')
      .where('booking.id = :id', { id });

    // Role-based visibility
    if (roles.includes('admin')) {
      // Admin can view anything
    } else if (roles.includes('partner')) {
      // Partner can only view bookings made with them
      query.andWhere('partner.user = :userId', { userId });
    } else {
      // Customers can only view bookings they created
      query.andWhere('booking.user = :userId', { userId });
    }

    const booking = await query.getOne();
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${id}`);
    }
    return booking;
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const booking = await this.dataSource.getRepository(Booking).findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${id}`);
    }
    await this.dataSource.getRepository(Booking).update(id, updateBookingDto);
    return this.findOne(id, 0, ['admin']); // Fetch with relations as admin
  }

  async remove(id: number) {
    const booking = await this.dataSource.getRepository(Booking).findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${id}`);
    }
    await this.dataSource.getRepository(Booking).delete(id);
    return { message: `Đã xoá đơn đặt lịch #${id}` };
  }

  async updateStatus(
    id: number,
    userId: number,
    roles: string[],
    status: BookingStatus
  ): Promise<Booking> {
    return await this.dataSource.transaction(async (manager) => {
      const bookingsRepo = manager.getRepository(Booking);
      const paymentsRepo = manager.getRepository(Payment);

      const booking = await bookingsRepo.findOne({
        where: { id },
        relations: ['partner', 'partner.user', 'payments', 'user'],
      });

      if (!booking) {
        throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${id}`);
      }

      // Authorization: Admin, specific partner, or the customer who created it
      if (!roles.includes('admin')) {
        const isPartnerOfBooking = roles.includes('partner') &&
          booking.partner &&
          booking.partner.user &&
          booking.partner.user.id === userId;

        const isCustomerOfBooking = booking.user && booking.user.id === userId;

        if (!isPartnerOfBooking && !isCustomerOfBooking) {
          throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái đơn đặt lịch này');
        }

        // If customer is performing the update
        if (!isPartnerOfBooking && isCustomerOfBooking) {
          if (status !== BookingStatus.CANCELLED) {
            throw new ForbiddenException('Khách hàng chỉ có quyền hủy đơn hàng');
          }
          if (booking.status !== BookingStatus.PENDING) {
            throw new BadRequestException('Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái chờ xác nhận');
          }
        }
      }

      const oldStatus = booking.status;
      if (oldStatus === status) {
        return booking;
      }

      if (oldStatus === BookingStatus.COMPLETED) {
        throw new BadRequestException('Không thể thay đổi trạng thái của đơn hàng đã hoàn thành');
      }

      if (oldStatus === BookingStatus.CANCELLED) {
        throw new BadRequestException('Không thể thay đổi trạng thái của đơn hàng đã hủy');
      }

      // Sync Payment states on manual confirmation
      if (status === BookingStatus.CONFIRMED) {
        const unpaidPayment = booking.payments?.find(p => p.status === PaymentStatus.UNPAID);
        if (unpaidPayment) {
          unpaidPayment.status = PaymentStatus.PARTIALLY_PAID;
          unpaidPayment.amount_paid = Number(booking.price_deposit);
          await paymentsRepo.save(unpaidPayment);

          booking.remaining_amount = Number(booking.price) - Number(booking.price_discount) - Number(unpaidPayment.amount_paid);
        }
      } else if (status === BookingStatus.COMPLETED) {
        if (oldStatus !== BookingStatus.CONFIRMED) {
          throw new BadRequestException('Chỉ có thể hoàn thành đơn hàng từ trạng thái đã xác nhận (confirmed)');
        }
        const activePayment = booking.payments?.find(p => p.status !== PaymentStatus.PAID);
        if (activePayment) {
          activePayment.status = PaymentStatus.PAID;
          const netPrice = Number(booking.price) - Number(booking.price_discount);
          activePayment.amount_paid = netPrice;
          await paymentsRepo.save(activePayment);

          booking.remaining_amount = 0;
        }
      }

      booking.status = status;
      await bookingsRepo.save(booking);

      return this.findOne(id, userId, roles);
    });
  }

  async applyPromotion(id: number, userId: number, code: string): Promise<Booking> {
    return await this.dataSource.transaction(async (manager) => {
      const bookingsRepo = manager.getRepository(Booking);
      const promotionsRepo = manager.getRepository(Promotion);

      const booking = await bookingsRepo.findOne({
        where: { id },
        relations: ['user', 'promotion', 'payments'],
      });

      if (!booking) {
        throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${id}`);
      }

      if (booking.user.id !== userId) {
        throw new ForbiddenException('Bạn không có quyền sửa đổi đơn đặt lịch này');
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể áp dụng mã giảm giá cho đơn hàng chờ xác nhận');
      }

      const hasPaid = booking.payments?.some(p => p.status !== PaymentStatus.UNPAID);
      if (hasPaid) {
        throw new BadRequestException('Đơn hàng đã được thanh toán cọc hoặc toàn bộ, không thể áp dụng mã giảm giá');
      }

      // If code is empty, remove the promotion
      if (!code || code.trim() === '') {
        booking.price_discount = 0;
        booking.price_deposit = parseFloat((Number(booking.price) * 0.3).toFixed(2));
        booking.remaining_amount = Number(booking.price);
        booking.promotion = null as any;

        await bookingsRepo.save(booking);
        return this.findOne(id, userId, ['customer']);
      }

      const promotion = await promotionsRepo.findOne({
        where: { code: code.toUpperCase() },
      });

      if (!promotion) {
        throw new NotFoundException(`Mã giảm giá '${code}' không tồn tại`);
      }

      if (!promotion.is_active) {
        throw new BadRequestException(`Khuyến mãi '${code}' hiện đang bị vô hiệu hoá`);
      }

      if (promotion.expired_at && new Date(promotion.expired_at) < new Date()) {
        throw new BadRequestException(`Khuyến mãi '${code}' đã hết hạn sử dụng`);
      }

      // Calculate discount
      const totalPrice = Number(booking.price);
      let discountAmount = 0;

      if (promotion.discount_percentage > 0) {
        discountAmount = totalPrice * (promotion.discount_percentage / 100);
      } else if (promotion.discount_amount > 0) {
        discountAmount = Number(promotion.discount_amount);
      }

      if (promotion.max_discount && discountAmount > Number(promotion.max_discount)) {
        discountAmount = Number(promotion.max_discount);
      }

      if (discountAmount > totalPrice) {
        discountAmount = totalPrice;
      }

      const netPrice = totalPrice - discountAmount;
      const depositAmount = parseFloat((netPrice * 0.3).toFixed(2));

      booking.price_discount = discountAmount;
      booking.price_deposit = depositAmount;
      booking.remaining_amount = netPrice;
      booking.promotion = promotion;

      await bookingsRepo.save(booking);

      return this.findOne(id, userId, ['customer']);
    });
  }
}
