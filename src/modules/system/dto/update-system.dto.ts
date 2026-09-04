import { IsOptional, IsString, IsEmail, IsUrl, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemDto {
  @ApiPropertyOptional({ example: 'support@aimalya.com' })
  @IsEmail()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({ example: 'https://aimalya.com/support' })
  @IsUrl()
  @IsOptional()
  supportUrl?: string;

  @ApiPropertyOptional({ example: 'Aimalya' })
  @IsString()
  @IsOptional()
  siteName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  supportPhone?: string;

  @ApiPropertyOptional({ example: 'Global' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 14 })
  @IsInt()
  @Min(0)
  @IsOptional()
  freeTrialDuration?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsInt()
  @Min(1)
  @IsOptional()
  planLimitMaxBusiness?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  planLimitMaxLocations?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isMaintenanceMode?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  allowSignups?: boolean;
}
