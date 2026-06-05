import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class ProcessPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  booking_id!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount_paid!: number;
}
