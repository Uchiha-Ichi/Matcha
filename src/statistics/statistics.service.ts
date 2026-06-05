import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async getDashboard() {
    // 1. Tổng số đơn hàng
    const totalBookings = await this.bookingRepository.count();

    // 2. Số đơn theo từng trạng thái
    const statusCounts = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('booking.status')
      .getRawMany<{ status: BookingStatus; count: string }>();

    const bookingsByStatus: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of statusCounts) {
      bookingsByStatus[row.status] = parseInt(row.count, 10);
    }

    // 3. Doanh thu thực tế: tổng amount_paid từ payment có status PAID hoặc PARTIALLY_PAID
    const revenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount_paid)', 'total')
      .where('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID],
      })
      .getRawOne<{ total: string | null }>();

    const totalRevenue = parseFloat(revenueResult?.total ?? '0');

    // 4. Doanh thu kỳ vọng: tổng (price - price_discount) của đơn confirmed hoặc completed
    const expectedRevenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.price - booking.price_discount)', 'total')
      .where('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      })
      .getRawOne<{ total: string | null }>();

    const expectedRevenue = parseFloat(expectedRevenueResult?.total ?? '0');

    return {
      total_bookings: totalBookings,
      bookings_by_status: bookingsByStatus,
      total_revenue: totalRevenue,
      expected_revenue: expectedRevenue,
    };
  }
}
