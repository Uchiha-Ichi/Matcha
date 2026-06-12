import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { PaymentType } from './entities/payment.entity';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createPaymentUrl(@Body() dto: CreatePaymentDto) {
    const result = await this.paymentsService.createPaymentUrl(dto.booking_id, dto.payment_type);
    return {
      url: result.checkoutUrl,
      checkoutUrl: result.checkoutUrl,
      qrCode: result.qrCode,
      orderCode: result.orderCode,
      paymentLinkId: result.paymentLinkId,
      amount: result.amount,
      status: result.status,
      payment: result.payment,
    };
  }

  @Get('test-url/:bookingId')
  @HttpCode(HttpStatus.OK)
  async testUrl(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Query('type') paymentType: PaymentType,
  ) {
    return await this.paymentsService.createPaymentUrl(bookingId, paymentType || PaymentType.DEPOSIT);
  }

  @Get('payos-return')
  @HttpCode(HttpStatus.FOUND)
  async payosReturn(@Query() query: any, @Res() res: express.Response) {
    const result = await this.paymentsService.handlePayosReturn(query);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const bookingId = result.bookingId;
    const status = result.success ? 'success' : 'fail';
    const message = encodeURIComponent(result.message);

    if (bookingId) {
      res.redirect(`${frontendUrl}/bookings/${bookingId}?paymentStatus=${status}&message=${message}`);
      return;
    }

    res.redirect(`${frontendUrl}/order-history?paymentStatus=${status}&message=${message}`);
  }

  @Post('payos-webhook')
  @HttpCode(HttpStatus.OK)
  async payosWebhook(@Body() body: any) {
    await this.paymentsService.handlePayosWebhook(body);
    return {
      error: 0,
      message: 'Ok',
      data: null,
    };
  }

  @Post('close-qr')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async closeQr(
    @Body('payment_id') paymentId?: number,
    @Body('payment_link_id') paymentLinkId?: string,
    @Body('order_code') orderCode?: string,
  ) {
    return this.paymentsService.removeTemporaryPayment({
      paymentId: paymentId ? Number(paymentId) : undefined,
      paymentLinkId,
      orderCode,
    });
  }

  @Post('process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async processPayment(@Body() dto: ProcessPaymentDto) {
    return this.paymentsService.processPayment(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.remove(id);
  }
}
