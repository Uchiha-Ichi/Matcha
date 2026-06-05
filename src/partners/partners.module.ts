import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from './entities/partner.entity';
import { User } from '../users/entities/user.entity';
import { ImageModule } from 'src/image/image.module';
import { DateBlock } from '../date-blocks/entities/date-block.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Partner, User, DateBlock, Booking]), ImageModule],
  controllers: [PartnersController],
  providers: [PartnersService],
})
export class PartnersModule { }
