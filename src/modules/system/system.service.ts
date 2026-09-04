import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSystemDto } from './dto/update-system.dto';

@Injectable()
export class SystemService implements OnModuleInit {
  constructor(private prisma: PrismaService) { }

  async onModuleInit() {
    await this.ensureSystemSettings();
  }

  private async ensureSystemSettings() {
    const existing = await this.prisma.system.findFirst();
    if (!existing) {
      await this.prisma.system.create({
        data: {
          supportEmail: process.env.SYSTEM_SUPPORT_EMAIL || 'support@aimalya.com',
          supportUrl: process.env.SYSTEM_SUPPORT_URL || 'https://aimalya.com/support',
          siteName: process.env.SYSTEM_SITE_NAME || 'Aimalya',
          supportPhone: process.env.SYSTEM_SUPPORT_PHONE || '+1234567890',
          location: process.env.SYSTEM_LOCATION || 'Global',
          freeTrialDuration: parseInt(process.env.SYSTEM_FREE_TRIAL_DURATION || '14', 10),
          planLimitMaxBusiness: parseInt(process.env.SYSTEM_PLAN_LIMIT_MAX_BUSINESS || '5', 10),
          planLimitMaxLocations: parseInt(process.env.SYSTEM_PLAN_LIMIT_MAX_LOCATIONS || '10', 10),
        }
      });
      console.log('🌱 System settings initialized automatically.');
    }
  }

  async getSystemSettings() {
    const system = await this.prisma.system.findFirst();
    if (!system) {
      // This should ideally not happen due to onModuleInit, but as a safety:
      return this.ensureSystemSettings().then(() => this.prisma.system.findFirst());
    }
    return system;
  }

  async updateSystemSettings(updateSystemDto: UpdateSystemDto) {
    const system = await this.prisma.system.findFirst();
    if (!system) {
      throw new NotFoundException('System settings not found');
    }

    return this.prisma.system.update({
      where: { systemId: system.systemId },
      data: updateSystemDto,
    });
  }
}
