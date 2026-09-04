import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'manager' })
  @IsString()
  @IsOptional()
  operationsRole?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Profile image file' })
  @IsOptional()
  image?: any;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  profileImage?: string;
}
