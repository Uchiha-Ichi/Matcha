import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * GET /api/v1/statistics/dashboard
   * Chỉ admin được phép truy cập.
   * Trả về tổng số đơn hàng, số đơn theo trạng thái, doanh thu thực tế và doanh thu kỳ vọng.
   */
  @Get('dashboard')
  @Roles('admin')
  async getDashboard() {
    return this.statisticsService.getDashboard();
  }
}
