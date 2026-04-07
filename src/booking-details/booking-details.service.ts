import { Injectable } from '@nestjs/common';
import { CreateBookingDetailDto } from './dto/create-booking-detail.dto';
import { UpdateBookingDetailDto } from './dto/update-booking-detail.dto';

@Injectable()
export class BookingDetailsService {
  create(createBookingDetailDto: CreateBookingDetailDto) {
    return 'This action adds a new bookingDetail';
  }

  findAll() {
    return `This action returns all bookingDetails`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bookingDetail`;
  }

  update(id: number, updateBookingDetailDto: UpdateBookingDetailDto) {
    return `This action updates a #${id} bookingDetail`;
  }

  remove(id: number) {
    return `This action removes a #${id} bookingDetail`;
  }
}
