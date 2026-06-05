import { Controller, Get, Post, Body, Param, Delete, UseGuards, ParseIntPipe, HttpCode, HttpStatus, Req, Res, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import * as express from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createPaymentUrl(
    @Body('booking_id', ParseIntPipe) bookingId: number,
    @Body('payment_type') paymentType: 'deposit' | 'full',
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const cleanIp = ipAddress.split(',')[0].trim();
    
    const url = await this.paymentsService.createPaymentUrl(bookingId, paymentType, cleanIp);
    return { url };
  }

  @Get('test-url/:bookingId')
  @HttpCode(HttpStatus.OK)
  async testUrl(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Query('type') paymentType: 'deposit' | 'full',
  ) {
    const url = await this.paymentsService.createPaymentUrl(bookingId, paymentType || 'deposit', '127.0.0.1');
    return { url };
  }

  @Get('vnpay-return')
  @HttpCode(HttpStatus.FOUND)
  async vnpayReturn(@Query() query: any, @Res() res: express.Response) {
    const result = await this.paymentsService.verifyVnpayPayment(query);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (result.success) {
      res.redirect(`${frontendUrl}/bookings/${result.bookingId}?paymentStatus=success`);
    } else {
      res.redirect(`${frontendUrl}/bookings/${result.bookingId}?paymentStatus=fail&message=${encodeURIComponent(result.message)}`);
    }
  }

  @Get('vnpay-ipn')
  @HttpCode(HttpStatus.OK)
  async vnpayIpn(@Query() query: any) {
    return await this.paymentsService.processVnpayIpn(query);
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
