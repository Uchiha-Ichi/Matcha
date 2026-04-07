import { Module } from '@nestjs/common';
import { BookingDetailsService } from './booking-details.service';
import { BookingDetailsController } from './booking-details.controller';

@Module({
  controllers: [BookingDetailsController],
  providers: [BookingDetailsService],
})
export class BookingDetailsModule {}
