import { IsInt, IsNumber, IsBoolean, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlanDto {
  @ApiProperty({ example: 1000, required: false })
  @IsOptional()
  @IsInt()
  review?: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsInt()
  location?: number;

  @ApiProperty({ example: 100.0, required: false })
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  business?: number;

  @ApiProperty({ example: ['Monthly', 'Weekly'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportPlan?: string[];

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  competitor?: boolean;
}
