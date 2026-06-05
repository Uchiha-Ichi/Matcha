import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { MessageType } from '../../messages/entities/message.entity';

export class SendMessageDto {
  @IsNumber()
  @IsNotEmpty()
  conversation_id!: number;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsNumber()
  @IsOptional()
  reply_to_id?: number;
}
