import { IsISO8601, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CheckoutCartDto {
  @IsISO8601()
  @IsNotEmpty()
  booking_time!: string;

  @IsNumber()
  @IsOptional()
  promotion_id?: number;
}
