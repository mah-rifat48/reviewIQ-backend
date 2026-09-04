import { IsNotEmpty, IsString, IsEnum, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationStatus, default: NotificationStatus.INFORMATION })
  @IsEnum(NotificationStatus)
  @IsNotEmpty()
  status: NotificationStatus;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiProperty({ example: 'New Message' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'You have received a new message from the administrator.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
