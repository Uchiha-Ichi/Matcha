import { IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

export class TypingDto {
  @IsNumber()
  @IsNotEmpty()
  conversation_id!: number;

  @IsBoolean()
  @IsNotEmpty()
  is_typing!: boolean;
}
