import { IsNumber, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsNumber()
  @IsOptional()
  partner_id?: number;

  @IsNumber()
  @IsOptional()
  user_id?: number;

  @IsNumber()
  @IsOptional()
  booking_id?: number;
}
