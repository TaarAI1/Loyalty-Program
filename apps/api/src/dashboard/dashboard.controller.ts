import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMetrics() {
    return this.dashboardService.getMetrics();
  }

  @Get('points-trend')
  getPointsTrend(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days = 30,
  ) {
    return this.dashboardService.getPointsTrend(days);
  }

  @Get('tier-distribution')
  getTierDistribution() {
    return this.dashboardService.getTierDistribution();
  }

  @Get('recent-transactions')
  getRecentTransactions(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  ) {
    return this.dashboardService.getRecentTransactions(limit);
  }
}
