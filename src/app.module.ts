import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RolesModule } from './roles/roles.module';
import { MessagesModule } from './messages/messages.module';
import { ConversationsModule } from './conversations/conversations.module';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { BookingDetailsModule } from './booking-details/booking-details.module';
import { BookingsModule } from './bookings/bookings.module';
import { CartsModule } from './carts/carts.module';
import { DateBlocksModule } from './date-blocks/date-blocks.module';
import { PartnerConceptsModule } from './partner-concepts/partner-concepts.module';
import { ConceptsModule } from './concepts/concepts.module';
import { PartnersModule } from './partners/partners.module';
import { CategoriesModule } from './categories/categories.module';
import { UsersModule } from './users/users.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AuthModule } from './auth/auth.module';
import { ImageModule } from './image/image.module';
import { StatisticsModule } from './statistics/statistics.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { MailModule } from './mail/mail.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';


@Module({
  imports: [
    // 1. Khởi tạo ConfigModule để đọc file .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Cấu hình Logger (nestjs-pino) — pretty khi dev, JSON khi production
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                  ignore: 'pid,hostname',
                },
              },
          },
        };
      },
    }),

    // 3. Cấu hình TypeORM kết nối tới MySQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') ?? '3306', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),

        // entities: [User, Booking, Message...], // Bạn sẽ nạp các bảng (table) vào đây sau
        autoLoadEntities: true,
        legacySpatialSupport: false, // Bắt buộc false cho MySQL 8.0+ để dùng ST_AsText thay vì AsText

        // CẢNH BÁO: synchronize=true sẽ tự động tạo/sửa bảng trong DB theo code của bạn.
        // Rất tiện khi code môi trường Dev, nhưng TUYỆT ĐỐI tắt (false) khi đưa lên Production (thực tế).
        synchronize: false,
      }),
    }),

    // 4. Redis — global, dùng được ở mọi module (AuthModule dùng lưu refresh token)
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
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

    CartsModule,

    BookingDetailsModule,

    PaymentsModule,

    NotificationsModule,

    FeedbacksModule,

    ConversationsModule,

    MessagesModule,

    PromotionsModule,

    AuthModule,

    ImageModule,

    StatisticsModule,

    ChatModule,

    AiModule,

    MailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Áp LoggerMiddleware cho tất cả route
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}