import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { BookingDetail } from '../booking-details/entities/booking-detail.entity';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { Partner } from '../partners/entities/partner.entity';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbacksRepository: Repository<Feedback>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: number, createFeedbackDto: CreateFeedbackDto): Promise<Feedback> {
    const { booking_detail_id, rating, description, image } = createFeedbackDto;

    return await this.dataSource.transaction(async (manager) => {
      const feedbacksRepo = manager.getRepository(Feedback);
      const bookingDetailsRepo = manager.getRepository(BookingDetail);
      const partnersRepo = manager.getRepository(Partner);

      // 1. Fetch BookingDetail with nested relations
      const bookingDetail = await bookingDetailsRepo.findOne({
        where: { id: booking_detail_id },
        relations: [
          'booking',
          'booking.user',
          'partner_concept',
          'partner_concept.partner',
        ],
      });

      if (!bookingDetail) {
        throw new NotFoundException(`Không tìm thấy chi tiết đặt lịch (BookingDetail) #${booking_detail_id}`);
      }

      // 2. Validate Ownership
      if (bookingDetail.booking.user.id !== userId) {
        throw new ForbiddenException('Bạn không có quyền đánh giá chi tiết đặt lịch của người khác');
      }

      // 3. Validate Booking Status (must be COMPLETED)
      if (bookingDetail.booking.status !== BookingStatus.COMPLETED) {
        throw new BadRequestException('Chỉ có thể đánh giá các dịch vụ đã hoàn thành');
      }

      // 4. Validate Duplicate Feedback
      const existing = await feedbacksRepo.findOne({
        where: { booking_detail: { id: booking_detail_id } },
      });
      if (existing) {
        throw new ConflictException('Bạn đã gửi đánh giá cho chi tiết đặt lịch này rồi');
      }

      // 5. Create and save Feedback
      const feedback = feedbacksRepo.create({
        description,
        image,
        rating,
        user: { id: userId } as any,  
        booking_detail: { id: booking_detail_id } as any,
      });
      const savedFeedback = await feedbacksRepo.save(feedback);

      // 6. Update Partner rating_avg and rating_count
      if (!bookingDetail.partner_concept || !bookingDetail.partner_concept.partner) {
        throw new BadRequestException('Không thể đánh giá vì concept dịch vụ hoặc thông tin đối tác không khả dụng (đã bị xóa)');
      }
      const partnerId = bookingDetail.partner_concept.partner.id;
      const partner = await partnersRepo.findOne({ where: { id: partnerId } });

      if (partner) {
        // Recalculate partner rating
        const currentAvg = Number(partner.rating_avg) || 0;
        const currentCount = Number(partner.rating_count) || 0;

        partner.rating_avg = parseFloat(
          ((currentAvg * currentCount + rating) / (currentCount + 1)).toFixed(2)
        );
        partner.rating_count = currentCount + 1;

        await partnersRepo.save(partner);
      }

      return savedFeedback;
    });
  }

  async findAll(): Promise<Feedback[]> {
    return await this.feedbacksRepository.find({
      relations: ['user', 'booking_detail', 'booking_detail.partner_concept', 'booking_detail.partner_concept.concept'],
    });
  }

  async findOne(id: number): Promise<Feedback> {
    const feedback = await this.feedbacksRepository.findOne({
      where: { id },
      relations: ['user', 'booking_detail', 'booking_detail.partner_concept', 'booking_detail.partner_concept.concept'],
    });
    if (!feedback) {
      throw new NotFoundException(`Không tìm thấy đánh giá #${id}`);
    }
    return feedback;
  }

  async update(id: number, updateFeedbackDto: UpdateFeedbackDto): Promise<Feedback> {
    const feedback = await this.findOne(id);
    const updated = await this.feedbacksRepository.save({
      ...feedback,
      ...updateFeedbackDto,
    });
    return updated;
  }

  async remove(id: number): Promise<{ message: string }> {
    const feedback = await this.findOne(id);
    await this.feedbacksRepository.remove(feedback);
    return { message: `Đã xoá thành công đánh giá #${id}` };
  }
}
