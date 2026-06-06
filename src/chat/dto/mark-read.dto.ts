import { IsNotEmpty, IsNumber } from 'class-validator';

export class MarkReadDto {
  @IsNumber()
  @IsNotEmpty()
  conversation_id!: number;
}
