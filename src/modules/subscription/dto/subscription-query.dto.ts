import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BaseQueryDto } from '../../../common/dto/pagination.dto';
import { SubscriptionPlan, PaymentStatus, DurationsPlan } from '@prisma/client';

export class SubscriptionQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: DurationsPlan })
  @IsOptional()
  @IsEnum(DurationsPlan)
  durationsPlan?: DurationsPlan;
}
