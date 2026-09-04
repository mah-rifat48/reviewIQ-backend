import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityStatus } from '@prisma/client';

export class CreateActivityLogDto {
  @ApiProperty({ example: 'User Signup' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: ActivityStatus, default: ActivityStatus.new_user })
  @IsEnum(ActivityStatus)
  @IsNotEmpty()
  status: ActivityStatus;
}
