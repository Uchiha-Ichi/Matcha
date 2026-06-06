import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(currentUser.userId, createBookingDto);
  }

  @Get()
  async findAll(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
    @Query('role') role?: string,
  ) {
    return this.bookingsService.findAll(currentUser.userId, currentUser.roles, role);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bookingsService.findOne(id, currentUser.userId, currentUser.roles);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Patch(':id/status')
  @Roles('admin', 'partner', 'customer')
  async updateStatus(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(
      id,
      currentUser.userId,
      currentUser.roles,
      updateBookingStatusDto.status,
    );
  }

  @Patch(':id/apply-promotion')
  async applyPromotion(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
    @Param('id', ParseIntPipe) id: number,
    @Body('code') code: string,
  ) {
    return this.bookingsService.applyPromotion(id, currentUser.userId, code);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.remove(id);
  }
}
