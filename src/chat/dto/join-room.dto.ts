import { IsNotEmpty, IsNumber } from 'class-validator';

export class JoinRoomDto {
  @IsNumber()
  @IsNotEmpty()
  conversation_id!: number;
}
