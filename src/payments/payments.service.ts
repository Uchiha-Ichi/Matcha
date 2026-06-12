import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
} from './entities/payment.entity';

type PayosPaymentType = PaymentType.DEPOSIT | PaymentType.REMAINING | PaymentType.FULL;

export interface PayosCreatePaymentResult {
  payment: Pick<
    Payment,
    | 'id'
    | 'provider'
    | 'payment_type'
    | 'status'
    | 'amount'
    | 'amount_paid'
    | 'currency'
    | 'order_code'
    | 'payment_link_id'
    | 'checkout_url'
    | 'qr_code'
    | 'description'
    | 'expired_at'
    | 'created_at'
    | 'updated_at'
  >;
  orderCode: number;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  status: string;
  amount: number;
  expiredAt: number;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async createPaymentUrl(
    bookingId: number,
    paymentType: PayosPaymentType = PaymentType.DEPOSIT,
  ): Promise<PayosCreatePaymentResult> {
    return this.createPayosPaymentLink(bookingId, paymentType);
  }

  async createPayosPaymentLink(
    bookingId: number,
    paymentType: PayosPaymentType = PaymentType.DEPOSIT,
  ): Promise<PayosCreatePaymentResult> {
    const booking = await this.dataSource.getRepository(Booking).findOne({
      where: { id: bookingId },
      relations: ['user', 'payments'],
    });
    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt lịch #${bookingId}`);
    }

    if ([BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status)) {
      throw new BadRequestException('Không thể tạo thanh toán cho đơn đã hoàn tất hoặc đã hủy');
    }

    const amount = this.resolvePaymentAmount(booking, paymentType);
    if (amount <= 0) {
      throw new BadRequestException('Đơn hàng đã được thanh toán đầy đủ');
    }

    const orderCode = this.generateOrderCode();
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:8000';
    const description = `Matcha booking ${bookingId}`;
    const returnUrl = `${backendUrl}/api/v1/payments/payos-return`;
    const cancelUrl = `${backendUrl}/api/v1/payments/payos-return`;
    const expiredAt = Math.floor(Date.now() / 1000) + 5 * 60;
    const expiredAtDate = new Date(expiredAt * 1000);

    const payload = {
      orderCode,
      amount,
      description,
      buyerName: booking.user?.full_name,
      buyerEmail: booking.user?.email,
      buyerPhone: booking.user?.phone,
      items: [
        {
          name: `Booking #${bookingId}`,
          quantity: 1,
          price: amount,
        },
      ],
      returnUrl,
      cancelUrl,
      expiredAt,
      signature: this.createPayosCreatePaymentSignature({
        amount,
        cancelUrl,
        description,
        orderCode,
        returnUrl,
      }),
    };

    const response = await this.postPayosPaymentRequest(payload);
    const data = response?.data;
    if (!data?.checkoutUrl || !data?.qrCode || !data?.paymentLinkId) {
      throw new InternalServerErrorException('payOS không trả về đủ thông tin thanh toán');
    }

    const payment =
      booking.payments?.find((item) =>
        [PaymentStatus.UNPAID, PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(item.status),
      ) ??
      this.paymentsRepository.create({
        booking,
      });

    payment.provider = PaymentProvider.PAYOS;
    payment.payment_type = paymentType;
    payment.status = PaymentStatus.PENDING;
    payment.amount = amount;
    payment.amount_paid = 0;
    payment.currency = data.currency || 'VND';
    payment.order_code = String(data.orderCode ?? orderCode);
    payment.payment_link_id = data.paymentLinkId;
    payment.checkout_url = data.checkoutUrl;
    payment.qr_code = data.qrCode;
    payment.description = description;
    payment.expired_at = data.expiredAt ? new Date(Number(data.expiredAt) * 1000) : expiredAtDate;
    payment.raw_response = response;

    const savedPayment = await this.paymentsRepository.save(payment);
    this.schedulePaymentDeletion(savedPayment.id, expiredAtDate);

    return {
      payment: this.toCreatePaymentResponse(savedPayment),
      orderCode: Number(data.orderCode ?? orderCode),
      paymentLinkId: data.paymentLinkId,
      checkoutUrl: data.checkoutUrl,
      qrCode: data.qrCode,
      status: data.status,
      amount,
      expiredAt: data.expiredAt ?? expiredAt,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      bankName: this.resolveBankName(data.bin),
    };
  }

  async handlePayosReturn(query: any): Promise<{ success: boolean; bookingId?: number; message: string }> {
    const orderCode = query.orderCode ? String(query.orderCode) : undefined;
    const paymentLinkId = query.id ? String(query.id) : undefined;

    const payment = await this.findPayosPayment(orderCode, paymentLinkId);
    if (!payment) {
      return { success: false, message: 'Không tìm thấy giao dịch payOS' };
    }

    if ([PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID].includes(payment.status)) {
      return {
        success: true,
        bookingId: payment.booking?.id,
        message: 'Thanh toán thành công',
      };
    }

    if (await this.deletePaymentIfExpired(payment)) {
      return {
        success: false,
        bookingId: payment.booking?.id,
        message: 'QR thanh toán đã hết hạn và giao dịch tạm đã được xóa',
      };
    }

    try {
      const payosId = payment.order_code || payment.payment_link_id;
      if (payosId) {
        const response = await this.getPayosPaymentRequest(payosId);
        const actualStatus = String(response?.data?.status || '').toUpperCase();

        if (actualStatus === 'PAID') {
          const paidAmount = Number(response?.data?.amountPaid || response?.data?.amount || payment.amount);
          const result = await this.markPaymentPaid(payment, paidAmount, response);
          return {
            success: true,
            bookingId: result.booking.id,
            message: 'Thanh toán thành công',
          };
        }

        if (actualStatus === 'CANCELLED') {
          await this.paymentsRepository.remove(payment);
          return {
            success: false,
            bookingId: payment.booking?.id,
            message: 'Thanh toán đã bị hủy và giao dịch tạm đã được xóa',
          };
        }

        if (['EXPIRED', 'FAILED'].includes(actualStatus)) {
          await this.paymentsRepository.remove(payment);
          return {
            success: false,
            bookingId: payment.booking?.id,
            message: 'QR thanh toán đã hết hạn và giao dịch tạm đã được xóa',
          };
        }
      }
    } catch (error) {
      this.configService.get('NODE_ENV') === 'development' && console.error('Lỗi đối soát PayOS:', error);
    }

    return {
      success: false,
      bookingId: payment.booking?.id,
      message: 'Thanh toán đang chờ xử lý',
    };
  }

  async handlePayosWebhook(body: any) {
    const webhookData = body?.data ?? body;
    const signature = body?.signature ?? webhookData?.signature;
    if (!webhookData || !signature || !this.verifyPayosSignature(webhookData, signature)) {
      throw new BadRequestException('Chữ ký webhook payOS không hợp lệ');
    }

    const orderCode = webhookData.orderCode ? String(webhookData.orderCode) : undefined;
    const paymentLinkId = webhookData.paymentLinkId ? String(webhookData.paymentLinkId) : undefined;
    const payment = await this.findPayosPayment(orderCode, paymentLinkId);
    if (!payment) {
      return {
        message: 'Không tìm thấy giao dịch tạm hoặc giao dịch đã được xử lý',
      };
    }

    if ([PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID].includes(payment.status)) {
      return { success: true, message: 'Giao dịch đã hoàn tất trước đó' };
    }

    if (await this.deletePaymentIfExpired(payment)) {
      return { success: true };
    }

    const paidAmount = Number(webhookData.amount || webhookData.amountPaid || payment.amount);
    const code = String(webhookData.code || '').toUpperCase();
    const desc = String(webhookData.desc || '').toUpperCase();

    payment.raw_webhook = body;

    if (code === '00' || desc === 'SUCCESS') {
      const result = await this.markPaymentPaid(payment, paidAmount, body);
      return { success: true, payment: result.payment, booking: result.booking };
    }

    if (desc.includes('EXPIRED') || desc.includes('FAILED')) {
      await this.paymentsRepository.remove(payment);
      return { success: true };
    }

    await this.paymentsRepository.save(payment);
    return { success: true, payment };
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
          payment_type: PaymentType.DEPOSIT,
        });
      }

      const netPrice = Number(booking.price) - Number(booking.price_discount);
      const depositPrice = Number(booking.price_deposit);

      if (amount_paid <= 0) {
        throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
      }

      if ([PaymentStatus.UNPAID, PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(payment.status)) {
        if (amount_paid >= netPrice) {
          payment.status = PaymentStatus.PAID;
          payment.paid_at = new Date();
          booking.status = BookingStatus.CONFIRMED;
          payment.amount_paid = amount_paid;
          booking.remaining_amount = Math.max(0, netPrice - amount_paid);
        } else if (amount_paid >= depositPrice) {
          payment.status = PaymentStatus.PARTIALLY_PAID;
          payment.paid_at = new Date();
          booking.status = BookingStatus.CONFIRMED;
          payment.amount_paid = amount_paid;
          booking.remaining_amount = Math.max(0, netPrice - amount_paid);
        } else {
          throw new BadRequestException(
            `Số tiền thanh toán ${amount_paid} không đủ để đóng tiền cọc tối thiểu là ${depositPrice}`,
          );
        }
      } else if (payment.status === PaymentStatus.PARTIALLY_PAID) {
        const currentPaid = Number(payment.amount_paid) || 0;
        const remaining = parseFloat((netPrice - currentPaid).toFixed(2));
        if (amount_paid >= remaining) {
          payment.status = PaymentStatus.PAID;
          payment.paid_at = new Date();
          payment.amount_paid = parseFloat((currentPaid + amount_paid).toFixed(2));
          booking.remaining_amount = 0;
        } else {
          throw new BadRequestException(
            `Số tiền thanh toán ${amount_paid} không đủ để thanh toán nốt phần tiền còn lại là ${remaining}`,
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
    await this.deleteExpiredPendingPayments();
    return await this.paymentsRepository.find({
      relations: ['booking'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Payment> {
    let payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['booking'],
    });
    if (!payment) {
      throw new NotFoundException(`Không tìm thấy giao dịch thanh toán #${id}`);
    }
    payment = await this.syncPayosPaymentStatus(payment);
    if (await this.deletePaymentIfExpired(payment)) {
      throw new NotFoundException(`Giao dịch thanh toán #${id} đã hết hạn và được xóa`);
    }
    return payment;
  }

  async remove(id: number): Promise<{ message: string }> {
    const payment = await this.findOne(id);
    await this.paymentsRepository.remove(payment);
    return { message: `Đã xoá thông tin giao dịch #${id} thành công` };
  }

  async removeTemporaryPayment(params: {
    paymentId?: number;
    paymentLinkId?: string;
    orderCode?: string;
  }): Promise<{ message: string }> {
    let payment: Payment | null = null;

    if (params.paymentId) {
      payment = await this.paymentsRepository.findOne({ where: { id: params.paymentId } });
    } else {
      payment = await this.findPayosPayment(params.orderCode, params.paymentLinkId);
    }

    if (!payment) {
      return { message: 'Khong tim thay giao dich tam hoac giao dich da duoc xu ly' };
    }

    if (![PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(payment.status)) {
      throw new BadRequestException('Chỉ có thể xóa giao dịch đang chờ thanh toán');
    }

    await this.paymentsRepository.remove(payment);
    return { message: `Đã xoá giao dịch thanh toán tạm #${payment.id}` };
  }

  private resolvePaymentAmount(booking: Booking, paymentType: PayosPaymentType): number {
    const netPrice = Number(booking.price) - Number(booking.price_discount);
    const depositPrice = Number(booking.price_deposit);
    const currentPaid = (booking.payments ?? [])
      .filter((payment) => [PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID].includes(payment.status))
      .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

    if (paymentType === PaymentType.DEPOSIT) {
      return Math.round(depositPrice);
    }

    return Math.round(Math.max(0, netPrice - currentPaid));
  }

  private async postPayosPaymentRequest(payload: Record<string, any>) {
    const clientId = this.requireEnv('PAYOS_CLIENT_ID');
    const apiKey = this.requireEnv('PAYOS_API_KEY');
    const baseUrl = this.configService.get<string>('PAYOS_API_BASE_URL') || 'https://api-merchant.payos.vn';

    try {
      const response = await axios.post(`${baseUrl}/v2/payment-requests`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId,
          'x-api-key': apiKey,
        },
      });

      if (response.data?.code !== '00') {
        throw new BadRequestException(response.data?.desc || 'payOS tạo link thanh toán thất bại');
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error.response?.data?.desc || error.response?.data?.message || error.message;
      throw new InternalServerErrorException(`Không thể tạo link thanh toán payOS: ${message}`);
    }
  }

  private async getPayosPaymentRequest(id: string) {
    const clientId = this.requireEnv('PAYOS_CLIENT_ID');
    const apiKey = this.requireEnv('PAYOS_API_KEY');
    const baseUrl = this.configService.get<string>('PAYOS_API_BASE_URL') || 'https://api-merchant.payos.vn';

    try {
      const response = await axios.get(`${baseUrl}/v2/payment-requests/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId,
          'x-api-key': apiKey,
        },
      });

      if (response.data?.code !== '00') {
        throw new BadRequestException(response.data?.desc || 'payOS lay thong tin thanh toan that bai');
      }

      return response.data;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error.response?.data?.desc || error.response?.data?.message || error.message;
      throw new InternalServerErrorException(`Khong the dong bo trang thai thanh toan payOS: ${message}`);
    }
  }

  private async syncPayosPaymentStatus(payment: Payment): Promise<Payment> {
    if (
      payment.provider !== PaymentProvider.PAYOS ||
      ![PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(payment.status)
    ) {
      return payment;
    }

    const payosId = payment.order_code || payment.payment_link_id;
    if (!payosId) {
      return payment;
    }

    const response = await this.getPayosPaymentRequest(payosId);
    const data = response?.data;
    const status = String(data?.status || '').toUpperCase();

    payment.raw_response = response;

    if (status === 'PAID') {
      const paidAmount = Number(data?.amountPaid || data?.amount || payment.amount);
      const result = await this.markPaymentPaid(payment, paidAmount, response);
      return result.payment;
    }

    if (status === 'CANCELLED') {
      await this.paymentsRepository.remove(payment);
      throw new NotFoundException('Giao dich thanh toan da bi huy');
    }

    if (status === 'EXPIRED') {
      await this.paymentsRepository.remove(payment);
      throw new NotFoundException('Giao dich thanh toan da het han');
    }

    return this.paymentsRepository.save(payment);
  }

  private async findPayosPayment(orderCode?: string, paymentLinkId?: string): Promise<Payment | null> {
    if (orderCode) {
      const payment = await this.paymentsRepository.findOne({
        where: { order_code: orderCode },
        relations: ['booking'],
      });
      if (payment) return payment;
    }

    if (paymentLinkId) {
      return await this.paymentsRepository.findOne({
        where: { payment_link_id: paymentLinkId },
        relations: ['booking'],
      });
    }

    return null;
  }

  private async deleteExpiredPendingPayments(): Promise<void> {
    const now = new Date();
    await this.paymentsRepository
      .createQueryBuilder()
      .delete()
      .from(Payment)
      .where('provider = :provider', { provider: PaymentProvider.PAYOS })
      .andWhere('status IN (:...statuses)', {
        statuses: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
      })
      .andWhere('expired_at IS NOT NULL')
      .andWhere('expired_at <= :now', { now })
      .execute();
  }

  private async deletePaymentIfExpired(payment: Payment): Promise<boolean> {
    if (
      payment.provider !== PaymentProvider.PAYOS ||
      !payment.expired_at ||
      ![PaymentStatus.PENDING, PaymentStatus.PROCESSING].includes(payment.status) ||
      payment.expired_at.getTime() > Date.now()
    ) {
      return false;
    }

    await this.paymentsRepository.remove(payment);
    return true;
  }

  private schedulePaymentDeletion(paymentId: number, expiredAt: Date): void {
    const delay = expiredAt.getTime() - Date.now();
    if (delay <= 0) return;

    setTimeout(async () => {
      const payment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
      if (payment) {
        await this.deletePaymentIfExpired(payment);
      }
    }, delay).unref();
  }

  private toCreatePaymentResponse(payment: Payment): PayosCreatePaymentResult['payment'] {
    return {
      id: payment.id,
      provider: payment.provider,
      payment_type: payment.payment_type,
      status: payment.status,
      amount: payment.amount,
      amount_paid: payment.amount_paid,
      currency: payment.currency,
      order_code: payment.order_code,
      payment_link_id: payment.payment_link_id,
      checkout_url: payment.checkout_url,
      qr_code: payment.qr_code,
      description: payment.description,
      expired_at: payment.expired_at,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    };
  }

  private async markPaymentPaid(
    payment: Payment,
    amountPaid: number,
    rawData?: Record<string, any>,
  ): Promise<{ payment: Payment; booking: Booking }> {
    return await this.dataSource.transaction(async (manager) => {
      const paymentsRepository = manager.getRepository(Payment);
      const bookingsRepository = manager.getRepository(Booking);

      const paymentInTx = await paymentsRepository.findOne({
        where: { id: payment.id },
        relations: ['booking'],
      });
      if (!paymentInTx?.booking) {
        throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
      }

      const booking = await bookingsRepository.findOne({ where: { id: paymentInTx.booking.id } });
      if (!booking) {
        throw new NotFoundException('Không tìm thấy đơn đặt lịch');
      }

      const paidAmount = Number(amountPaid || paymentInTx.amount);
      const netPrice = Number(booking.price) - Number(booking.price_discount);
      const previousPaid = await paymentsRepository
        .createQueryBuilder('payment')
        .where('payment.booking_id = :bookingId', { bookingId: booking.id })
        .andWhere('payment.id != :paymentId', { paymentId: paymentInTx.id })
        .andWhere('payment.status IN (:...statuses)', {
          statuses: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID],
        })
        .select('COALESCE(SUM(payment.amount_paid), 0)', 'total')
        .getRawOne<{ total: string }>();
      const previousPaidAmount = Number(previousPaid?.total || 0);
      const currentPaidAmount = Math.max(Number(paymentInTx.amount_paid || 0), paidAmount);
      const totalPaid = Math.min(netPrice, previousPaidAmount + currentPaidAmount);

      paymentInTx.amount_paid = Math.min(Number(paymentInTx.amount || currentPaidAmount), currentPaidAmount);
      paymentInTx.status = totalPaid >= netPrice || paymentInTx.amount_paid >= Number(paymentInTx.amount)
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIALLY_PAID;
      paymentInTx.paid_at = paymentInTx.paid_at ?? new Date();
      paymentInTx.raw_webhook = rawData ?? paymentInTx.raw_webhook;

      booking.status = BookingStatus.CONFIRMED;
      booking.remaining_amount = Math.max(0, netPrice - totalPaid);

      const savedPayment = await paymentsRepository.save(paymentInTx);
      const savedBooking = await bookingsRepository.save(booking);

      return { payment: savedPayment, booking: savedBooking };
    });
  }

  private createPayosCreatePaymentSignature(data: {
    amount: number;
    cancelUrl: string;
    description: string;
    orderCode: number;
    returnUrl: string;
  }): string {
    const signedData = [
      `amount=${data.amount}`,
      `cancelUrl=${data.cancelUrl}`,
      `description=${data.description}`,
      `orderCode=${data.orderCode}`,
      `returnUrl=${data.returnUrl}`,
    ].join('&');

    return crypto.createHmac('sha256', this.requireEnv('PAYOS_CHECKSUM_KEY')).update(signedData).digest('hex');
  }

  private verifyPayosSignature(data: Record<string, any>, signature: string): boolean {
    const rawSignature = this.createPayosWebhookSignature(data);
    const encodedSignature = this.createPayosWebhookSignature(data, true);
    return rawSignature === signature || encodedSignature === signature;
  }

  private createPayosWebhookSignature(data: Record<string, any>, encodeValue = false): string {
    const sortedData = Object.keys(data)
      .filter((key) => key !== 'signature' && data[key] !== undefined && data[key] !== null)
      .sort()
      .map((key) => {
        const value = String(data[key]);
        return `${key}=${encodeValue ? encodeURI(value) : value}`;
      })
      .join('&');

    return crypto.createHmac('sha256', this.requireEnv('PAYOS_CHECKSUM_KEY')).update(sortedData).digest('hex');
  }

  private generateOrderCode(): number {
    // PayOS giới hạn mã đơn hàng (orderCode) tối đa là 13 chữ số.
    // Lấy timestamp tính bằng giây (10 chữ số) ghép thêm 3 chữ số ngẫu nhiên = 13 chữ số.
    return Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
  }

  private resolveBankName(bin?: string): string {
    if (!bin) return 'Ngân hàng liên kết';
    const banks: Record<string, string> = {
      '970415': 'VietinBank',
      '970418': 'BIDV',
      '970436': 'Vietcombank',
      '970407': 'Techcombank',
      '970422': 'MBBank',
      '970432': 'VPBank',
      '970416': 'ACB',
      '970403': 'Sacombank',
      '970423': 'TPBank',
      '970405': 'Agribank',
    };
    return banks[bin] || `Ngân hàng (${bin})`;
  }

  private requireEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(`Thiếu cấu hình ${key}`);
    }
    return value;
  }
}
