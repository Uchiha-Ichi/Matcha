import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { PaymentType } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsInt()
  @IsNotEmpty()
  booking_id!: number;

  @IsEnum(PaymentType)
  payment_type: PaymentType = PaymentType.DEPOSIT;
}
