import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { VnpayService } from 'nestjs-vnpay';
import { ProductCode, VnpLocale, dateFormat } from 'vnpay';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly vnpayService: VnpayService,
  ) { }

  async createPaymentUrl(bookingId: number, paymentType: 'deposit' | 'full', ipAddress: string): Promise<string> {
    const booking = await this.dataSource.getRepository(Booking).findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${bookingId}`);
    }

    const netPrice = Number(booking.price) - Number(booking.price_discount);
    const depositPrice = Number(booking.price_deposit);

    let amount = 0;
    if (paymentType === 'deposit') {
      amount = depositPrice;
    } else {
      const payment = await this.paymentsRepository.findOne({
        where: { booking: { id: bookingId } },
      });
      const currentPaid = payment ? Number(payment.amount_paid) : 0;
      amount = netPrice - currentPaid;
    }

    if (amount <= 0) {
      throw new BadRequestException('Đơn hàng đã được thanh toán đầy đủ');
    }

    const vnpAmount = Math.round(amount * 100);

    const paymentUrl = this.vnpayService.buildPaymentUrl({
      vnp_Amount: vnpAmount,
      vnp_IpAddr: ipAddress || '127.0.0.1',
      vnp_TxnRef: `${bookingId}_${Date.now()}`,
      vnp_OrderInfo: `Thanh toan don dat lich #${bookingId} (${paymentType})`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: process.env.VNP_RETURNURL || 'http://localhost:8000/api/v1/payments/vnpay-return',
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
    });

    return paymentUrl;
  }

  async verifyVnpayPayment(query: any): Promise<{ success: boolean; message: string; bookingId?: number }> {
    try {
      const verify = await this.vnpayService.verifyReturnUrl(query);
      if (!verify.isVerified) {
        return { success: false, message: 'Chữ ký không hợp lệ' };
      }
      if (!verify.isSuccess) {
        return { success: false, message: 'Thanh toán thất bại từ VNPay' };
      }

      const txnRef = query.vnp_TxnRef;
      if (!txnRef) {
        return { success: false, message: 'Không tìm thấy mã giao dịch vnp_TxnRef' };
      }
      const bookingId = parseInt(txnRef.split('_')[0], 10);

      const vnpAmount = parseInt(query.vnp_Amount, 10);
      const amountPaid = vnpAmount / 100;

      await this.processPayment({
        booking_id: bookingId,
        amount_paid: amountPaid,
      });

      return { success: true, message: 'Thanh toán thành công', bookingId };
    } catch (error: any) {
      return { success: false, message: error.message || 'Lỗi khi xử lý thanh toán' };
    }
  }

  async processVnpayIpn(query: any) {
    try {
      const verify = await this.vnpayService.verifyReturnUrl(query);
      if (!verify.isVerified) {
        return { RspCode: '97', Message: 'Invalid signature' };
      }

      const txnRef = query.vnp_TxnRef;
      if (!txnRef) {
        return { RspCode: '01', Message: 'Order not found' };
      }
      const bookingId = parseInt(txnRef.split('_')[0], 10);

      const booking = await this.dataSource.getRepository(Booking).findOne({
        where: { id: bookingId },
      });
      if (!booking) {
        return { RspCode: '01', Message: 'Order not found' };
      }

      const vnpAmount = parseInt(query.vnp_Amount, 10);
      const amountPaid = vnpAmount / 100;

      const payment = await this.paymentsRepository.findOne({
        where: { booking: { id: bookingId } },
      });
      if (payment && payment.status === PaymentStatus.PAID) {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      if (query.vnp_ResponseCode === '00') {
        await this.processPayment({
          booking_id: bookingId,
          amount_paid: amountPaid,
        });
        return { RspCode: '00', Message: 'Confirm Success' };
      } else {
        return { RspCode: '00', Message: 'Confirm Success' };
      }
    } catch (error) {
      return { RspCode: '99', Message: 'Unknown Error' };
    }
  }

  async processPayment(dto: ProcessPaymentDto): Promise<{ payment: Payment; booking: Booking }> {
    const { booking_id, amount_paid } = dto;

    return await this.dataSource.transaction(async (manager) => {
      const bookingsRepository = manager.getRepository(Booking);
      const paymentsRepository = manager.getRepository(Payment);

      const booking = await bookingsRepository.findOne({
        where: { id: booking_id },
      });
      if (!booking) {
        throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${booking_id}`);
      }

      let payment = await paymentsRepository.findOne({
        where: { booking: { id: booking_id } },
      });

      if (!payment) {
        payment = paymentsRepository.create({
          booking,
          status: PaymentStatus.UNPAID,
        });
      }

      const netPrice = Number(booking.price) - Number(booking.price_discount);
      const depositPrice = Number(booking.price_deposit);

      if (amount_paid <= 0) {
        throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
      }

      if (payment.status === PaymentStatus.UNPAID) {
        if (amount_paid >= netPrice) {
          payment.status = PaymentStatus.PAID;
          booking.status = BookingStatus.CONFIRMED;
          payment.amount_paid = amount_paid;
          booking.remaining_amount = Math.max(0, netPrice - amount_paid);
        } else if (amount_paid >= depositPrice) {
          payment.status = PaymentStatus.PARTIALLY_PAID;
          booking.status = BookingStatus.CONFIRMED;
          payment.amount_paid = amount_paid;
          booking.remaining_amount = Math.max(0, netPrice - amount_paid);
        } else {
          throw new BadRequestException(
            `Số tiền thanh toán ${amount_paid} không đủ để đóng tiền cọc tối thiểu là ${depositPrice}`
          );
        }
      } else if (payment.status === PaymentStatus.PARTIALLY_PAID) {
        const currentPaid = Number(payment.amount_paid) || 0;
        const remaining = parseFloat((netPrice - currentPaid).toFixed(2));
        if (amount_paid >= remaining) {
          payment.status = PaymentStatus.PAID;
          payment.amount_paid = parseFloat((currentPaid + amount_paid).toFixed(2));
          booking.remaining_amount = 0;
        } else {
          throw new BadRequestException(
            `Số tiền thanh toán ${amount_paid} không đủ để thanh toán nốt phần tiền còn lại là ${remaining}`
          );
        }
      } else if (payment.status === PaymentStatus.PAID) {
        throw new BadRequestException('Đơn đặt lịch này đã được thanh toán đầy đủ');
      }

      const savedPayment = await paymentsRepository.save(payment);
      const savedBooking = await bookingsRepository.save(booking);

      return {
        payment: savedPayment,
        booking: savedBooking,
      };
    });
  }

  async findAll(): Promise<Payment[]> {
    return await this.paymentsRepository.find({
      relations: ['booking'],
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['booking'],
    });
    if (!payment) {
      throw new NotFoundException(`Không tìm thấy giao dịch thanh toán #${id}`);
    }
    return payment;
  }

  async remove(id: number): Promise<{ message: string }> {
    const payment = await this.findOne(id);
    await this.paymentsRepository.remove(payment);
    return { message: `Đã xoá thông tin giao dịch #${id} thành công` };
  }
}
