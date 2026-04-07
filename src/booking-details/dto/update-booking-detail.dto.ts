import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDetailDto } from './create-booking-detail.dto';

export class UpdateBookingDetailDto extends PartialType(CreateBookingDetailDto) {}
