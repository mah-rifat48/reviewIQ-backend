import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCardInfoDto {
  @ApiProperty({ example: '4111222233334444' })
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  cvc: string;

  @ApiProperty({ example: '12/26' })
  @IsString()
  @IsNotEmpty()
  expiryDate: string;

}

