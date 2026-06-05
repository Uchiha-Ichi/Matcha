import { IsNotEmpty, IsNumber, IsOptional, IsArray, ArrayNotEmpty, IsISO8601 } from 'class-validator';

export class CreateBookingDto {
  @IsNumber()
  @IsNotEmpty()
  partner_id!: number;

  @IsISO8601()
  @IsNotEmpty()
  booking_time!: string;

  @IsNumber()
  @IsOptional()
  promotion_id?: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  partner_concept_ids!: number[];
}
