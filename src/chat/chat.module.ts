import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './ws-jwt.guard';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Partner } from '../partners/entities/partner.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, User, Partner, Booking]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, WsJwtGuard],
})
export class ChatModule {}
