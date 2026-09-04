import { IsNotEmpty, IsString, IsEnum, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { SupportTicketStatus, SupportTicketPriority, SupportTicketCategory } from '@prisma/client';

export class CreateSupportTicketDto {
  @ApiPropertyOptional({ enum: SupportTicketStatus, default: SupportTicketStatus.OPEN })
  @IsEnum(SupportTicketStatus)
  @IsOptional()
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: SupportTicketPriority, default: SupportTicketPriority.MEDIUM })
  @IsEnum(SupportTicketPriority)
  @IsOptional()
  priority?: SupportTicketPriority;

  @ApiProperty({ enum: SupportTicketCategory })
  @IsEnum(SupportTicketCategory)
  @IsNotEmpty()
  category: SupportTicketCategory;

  @ApiProperty({ example: 'Cannot login to my account' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'I am receiving an invalid credentials error even though my password is correct.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'Property name' })
  @IsString()
  @IsOptional()
  property?: string;

  @ApiHideProperty()
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  userIds?: string[];

  @ApiPropertyOptional({ example: 'Thank you for resolving this so quickly.' })
  @IsString()
  @IsOptional()
  feedback?: string;
}
