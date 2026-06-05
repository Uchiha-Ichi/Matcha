import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { VnpayModule } from 'nestjs-vnpay';
import { ignoreLogger } from 'vnpay';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [TypeOrmModule.forFeature([Payment]),
  VnpayModule.register({
    tmnCode: process.env.VNP_TMNCODE!,
    secureSecret: process.env.VNP_HASHSECRET!,
    vnpayHost: 'https://sandbox.vnpayment.vn',
    testMode: true,
    enableLog: true,
    loggerFn: ignoreLogger,
  }),],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule { }
