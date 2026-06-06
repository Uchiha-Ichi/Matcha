import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class GetMessagesDto {
  @IsNumber()
  @IsNotEmpty()
  conversation_id!: number;

  @IsNumber()
  @IsOptional()
  page?: number;
}
