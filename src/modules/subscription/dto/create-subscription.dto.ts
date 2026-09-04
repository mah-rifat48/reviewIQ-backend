import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, DurationsPlan } from '@prisma/client';

export class CreateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionPlan, default: SubscriptionPlan.NONE })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', description: 'Required for Enterprise plan or when created by an admin' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'Excellent experience!' })
  @IsString()
  @IsOptional()
  review?: string;

  @ApiPropertyOptional({ example: 'London, UK' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 100.0 })
  @IsNumber()
  @IsOptional()
  balance?: number;


  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  business?: any;



  @ApiPropertyOptional({ example: ['SALES', 'TRAFFIC'] })
  @IsOptional()
  reportPlan?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  competitor?: boolean;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsDateString()
  @IsNotEmpty()
  durationDate: string;

  @ApiPropertyOptional({ enum: DurationsPlan, default: DurationsPlan.MONTHLY })
  @IsEnum(DurationsPlan)
  @IsOptional()
  durationsPlan?: DurationsPlan;
}
