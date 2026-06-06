import { IsNotEmpty, IsNumber } from 'class-validator';

export class LeaveRoomDto {
  @IsNumber()
  @IsNotEmpty()
  conversation_id!: number;
}
