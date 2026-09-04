import { Module } from '@nestjs/common';
import { PlanSettingsService } from './plan-settings.service';
import { PlanSettingsController } from './plan-settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PlanSettingsService],
  controllers: [PlanSettingsController]
})
export class PlanSettingsModule {}
