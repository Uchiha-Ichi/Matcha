import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsNumber()
  @IsNotEmpty()
  partner_id!: number;

  @IsNumber()
  @IsOptional()
  booking_id?: number;
}
