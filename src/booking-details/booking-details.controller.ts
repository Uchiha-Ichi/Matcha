import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BookingDetailsService } from './booking-details.service';
import { CreateBookingDetailDto } from './dto/create-booking-detail.dto';
import { UpdateBookingDetailDto } from './dto/update-booking-detail.dto';

@Controller('booking-details')
export class BookingDetailsController {
  constructor(private readonly bookingDetailsService: BookingDetailsService) {}

  @Post()
  create(@Body() createBookingDetailDto: CreateBookingDetailDto) {
    return this.bookingDetailsService.create(createBookingDetailDto);
  }

  @Get()
  findAll() {
    return this.bookingDetailsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingDetailsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDetailDto: UpdateBookingDetailDto) {
    return this.bookingDetailsService.update(+id, updateBookingDetailDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingDetailsService.remove(+id);
  }
}
