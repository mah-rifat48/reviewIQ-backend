import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStarterPlan() {
    const plan = await this.prisma.starterPlan.findFirst();
    if (!plan) throw new NotFoundException('Starter plan settings not found');
    return plan;
  }

  async updateStarterPlan(updatePlanDto: UpdatePlanDto) {
    const plan = await this.getStarterPlan();
    return this.prisma.starterPlan.update({
      where: { id: plan.id },
      data: updatePlanDto,
    });
  }

  async getProfessionalPlan() {
    const plan = await this.prisma.professionalPlan.findFirst();
    if (!plan) throw new NotFoundException('Professional plan settings not found');
    return plan;
  }

  async updateProfessionalPlan(updatePlanDto: UpdatePlanDto) {
    const plan = await this.getProfessionalPlan();
    return this.prisma.professionalPlan.update({
      where: { id: plan.id },
      data: updatePlanDto,
    });
  }
}
