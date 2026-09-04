import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({ example: 'Admin User' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'password123', minLength: 6 })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Profile image file' })
  @IsOptional()
  image?: any;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  profileImage?: string;
}
