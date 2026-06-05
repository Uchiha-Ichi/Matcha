import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Partner } from './entities/partner.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ImageService } from 'src/image/image.service';
import { ImageTargetType } from 'src/image/entities/image.entity';
import { DateBlock } from '../date-blocks/entities/date-block.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnersRepository: Repository<Partner>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(DateBlock)
    private readonly dateBlocksRepository: Repository<DateBlock>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly imageService: ImageService,
  ) { }

  async create(createPartnerDto: CreatePartnerDto) {
    const partner = await this.partnersRepository.findOne({ where: { user: { id: createPartnerDto.user_id } } });
    if (partner) {
      throw new NotFoundException(`Partner đã tồn tại #${createPartnerDto.user_id}`);
    }
    const savedPartner = await this.partnersRepository.save(createPartnerDto);
    if (createPartnerDto.cover_image) {
      await this.imageService.createImage(ImageTargetType.PARTNER, savedPartner.id, createPartnerDto.cover_image, true);
    }
    return savedPartner;
  }

  async findAll() {
    const partners = await this.partnersRepository.find();
    if (!partners) {
      throw new NotFoundException(`Không tìm thấy partner`);
    }
    for (const partner of partners) {
      const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER, partner.id);
      partner['images'] = images;
      const primary = images.find(img => img.is_primary);
      if (primary) {
        partner.cover_image = primary.image_src;
      }
    }
    return partners;
  }

  async findOne(id: number) {
    const partner = await this.partnersRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy partner #${id}`);
    }
    const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER, id);
    partner['images'] = images;
    const primary = images.find(img => img.is_primary);
    if (primary) {
      partner.cover_image = primary.image_src;
    }
    return partner;
  }

  /** Load partner kèm relation user (dùng để kiểm tra quyền ownership) */
  async findOneWithUser(id: number) {
    const partner = await this.partnersRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy partner #${id}`);
    }
    return partner;
  }

  async update(id: number, updatePartnerDto: UpdatePartnerDto) {
    const partner = await this.partnersRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy partner #${id}`);
    }
    if (updatePartnerDto.cover_image) {
      await this.imageService.updatePrimaryImage(ImageTargetType.PARTNER, id, updatePartnerDto.cover_image);
    }
    return await this.partnersRepository.update(id, updatePartnerDto);
  }

  async remove(id: number) {
    const partner = await this.partnersRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy partner #${id}`);
    }
    await this.imageService.deleteImagesForTarget(ImageTargetType.PARTNER, id);
    return await this.partnersRepository.delete(id);
  }

  async updateRatingAvg(id: number, rating: number) {
    const partner = await this.partnersRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy partner #${id}`);
    }
    partner.rating_avg = (partner.rating_avg * partner.rating_count + rating) / (partner.rating_count + 1);
    partner.rating_count += 1;
    return await this.partnersRepository.save(partner);
  }

  async findAllByRating() {
    const partners = await this.findAll();
    return partners.sort((a, b) => b.rating_avg - a.rating_avg);
  }

  private parseLocation(location: any): { longitude: number; latitude: number } | null {
    if (!location) return null;

    if (typeof location === 'string') {
      const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
      if (match) {
        return { longitude: parseFloat(match[1]), latitude: parseFloat(match[2]) };
      }
    }

    if (typeof location === 'object') {
      const x = location.x ?? location.longitude;
      const y = location.y ?? location.latitude;
      if (typeof x === 'number' && typeof y === 'number') {
        return { longitude: x, latitude: y };
      }
    }

    return null;
  }

  async searchNearby(latitude: number, longitude: number, radiusKm: number = 10) {
    const radiusInMeters = radiusKm * 1000;
    const pointWkt = `POINT(${longitude} ${latitude})`;

    const queryBuilder = this.partnersRepository.createQueryBuilder('partner');

    const partners = await queryBuilder
      .addSelect(`ST_Distance_Sphere(partner.location_gps, ST_GeomFromText(:pointWkt))`, 'distance')
      .setParameter('pointWkt', pointWkt)
      .where(`ST_Distance_Sphere(partner.location_gps, ST_GeomFromText(:pointWkt)) <= :radius`, { radius: radiusInMeters })
      .orderBy('distance', 'ASC')
      .getRawAndEntities();

    return await Promise.all(partners.entities.map(async (entity, index) => {
      const raw = partners.raw[index];
      const distance = raw && raw.distance !== undefined ? parseFloat(raw.distance) : undefined;

      const images = await this.imageService.getImagesForTarget(ImageTargetType.PARTNER, entity.id);
      entity['images'] = images;
      const primary = images.find(img => img.is_primary);
      if (primary) {
        entity.cover_image = primary.image_src;
      }

      return {
        ...entity,
        location_gps: this.parseLocation(entity.location_gps) || entity.location_gps,
        distance_meters: distance,
      };
    }));
  }

  async updateImage(id: number, url: string) {
    const partner = await this.partnersRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy partner #${id}`);
    }
    await this.imageService.updatePrimaryImage(ImageTargetType.PARTNER, id, url);
    partner.cover_image = url;
    return await this.partnersRepository.save(partner);
  }

  /**
   * Trả về lịch tổng hợp: các ngày bị block và các ngày đã có booking
   * Admin có thể xem bất kỳ partner nào.
   * Partner chỉ được xem lịch của chính họ (controller kiểm tra quyền).
   */
  async getCalendar(partnerId: number): Promise<{
    date: string;
    type: 'blocked' | 'booked';
    booking_id?: number;
    booking_status?: string;
  }[]> {
    // Kiểm tra partner tồn tại
    const partner = await this.partnersRepository.findOne({ where: { id: partnerId } });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy partner #${partnerId}`);
    }

    // 1. Ngày bị block
    const dateBlocks = await this.dateBlocksRepository.find({
      where: { partner: { id: partnerId } },
    });

    // 2. Booking chưa bị hủy
    const bookings = await this.bookingsRepository.find({
      where: { partner: { id: partnerId } },
    });
    const activeBookings = bookings.filter(b => b.status !== BookingStatus.CANCELLED);

    // 3. Gộp thành mảng CalendarEvent
    const events: { date: string; type: 'blocked' | 'booked'; booking_id?: number; booking_status?: string }[] = [];

    for (const block of dateBlocks) {
      events.push({
        date: new Date(block.date_block).toISOString().split('T')[0],
        type: 'blocked',
      });
    }

    for (const booking of activeBookings) {
      events.push({
        date: new Date(booking.booking_time).toISOString().split('T')[0],
        type: 'booked',
        booking_id: booking.id,
        booking_status: booking.status,
      });
    }

    // 4. Sắp xếp theo ngày tăng dần
    events.sort((a, b) => a.date.localeCompare(b.date));

    return events;
  }
}
