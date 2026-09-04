import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Return total statistics and trends.' })
  getStatistics() {
    return this.dashboardService.getStatistics();
  }

  @Get('charts')
  @ApiOperation({ summary: 'Get dashboard charts data' })
  @ApiResponse({ status: 200, description: 'Return plan distribution and revenue growth chart data.' })
  getCharts() {
    return this.dashboardService.getChartData();
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: 'Get conversion funnel metrics' })
  @ApiResponse({ status: 200, description: 'Return data covering signups down to converted paid users.' })
  getConversionFunnel() {
    return this.dashboardService.getConversionFunnel();
  }

  @Get('subscription-management')
  @ApiOperation({ summary: 'Get subscription management dashboard data' })
  @ApiResponse({ status: 200, description: 'Return MRR, status counts, revenue chart and recent subscriptions.' })
  getSubscriptionManagement() {
    return this.dashboardService.getSubscriptionManagement();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with their subscription details' })
  @ApiResponse({ status: 200, description: 'Return detailed user list for management.' })
  getUsers() {
    return this.dashboardService.getUsers();
  }
}
