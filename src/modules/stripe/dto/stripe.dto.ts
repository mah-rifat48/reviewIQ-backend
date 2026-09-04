import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'premium', description: 'The plan name' })
  @IsString()
  @IsNotEmpty()
  plan: string;

  @ApiProperty({ example: 'monthly', description: 'The duration of the plan' })
  @IsString()
  @IsNotEmpty()
  durationsPlan: string;
}
