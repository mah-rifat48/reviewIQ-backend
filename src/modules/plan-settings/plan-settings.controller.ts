import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanSettingsService } from './plan-settings.service';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRole } from '@prisma/client';

@ApiTags('Plan Settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
@Controller('plan-settings')
export class PlanSettingsController {
  constructor(private readonly planSettingsService: PlanSettingsService) {}

  @Get('starter')
  @Public()
  @ApiOperation({ summary: 'Get Starter Plan Settings' })
  getStarterPlan() {
    return this.planSettingsService.getStarterPlan();
  }

  @Patch('starter')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Starter Plan Settings' })
  updateStarterPlan(@Body() updatePlanDto: UpdatePlanDto) {
    return this.planSettingsService.updateStarterPlan(updatePlanDto);
  }

  @Get('professional')
  @Public()
  @ApiOperation({ summary: 'Get Professional Plan Settings' })
  getProfessionalPlan() {
    return this.planSettingsService.getProfessionalPlan();
  }

  @Patch('professional')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Professional Plan Settings' })
  updateProfessionalPlan(@Body() updatePlanDto: UpdatePlanDto) {
    return this.planSettingsService.updateProfessionalPlan(updatePlanDto);
  }
}
