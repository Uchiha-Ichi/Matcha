import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesModule } from './roles/roles.module';
import { MessagesModule } from './messages/messages.module';
import { ConversationsModule } from './conversations/conversations.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { BookingDetailsModule } from './booking-details/booking-details.module';
import { BookingsModule } from './bookings/bookings.module';
import { DateBlocksModule } from './date-blocks/date-blocks.module';
import { PartnerConceptsModule } from './partner-concepts/partner-concepts.module';
import { ConceptsModule } from './concepts/concepts.module';
import { PartnersModule } from './partners/partners.module';
import { CategoriesModule } from './categories/categories.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // 1. Khởi tạo ConfigModule để đọc file .env
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    // 2. Cấu hình TypeORM kết nối tới MySQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        
        // entities: [User, Booking, Message...], // Bạn sẽ nạp các bảng (table) vào đây sau
        autoLoadEntities: true, 
        
        // CẢNH BÁO: synchronize=true sẽ tự động tạo/sửa bảng trong DB theo code của bạn. 
        // Rất tiện khi code môi trường Dev, nhưng TUYỆT ĐỐI tắt (false) khi đưa lên Production (thực tế).
        synchronize: true, 
      }),
    }),

    RolesModule,

    UsersModule,

    CategoriesModule,

    PartnersModule,

    ConceptsModule,

    PartnerConceptsModule,

    DateBlocksModule,

    BookingsModule,

    BookingDetailsModule,

    PaymentsModule,

    NotificationsModule,

    FeedbacksModule,

    ConversationsModule,

    MessagesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}