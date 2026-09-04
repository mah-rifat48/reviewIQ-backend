import { Module } from '@nestjs/common';
import { CardInfoService } from './card-info.service';
import { CardInfoController } from './card-info.controller';

@Module({
  controllers: [CardInfoController],
  providers: [CardInfoService],
  exports: [CardInfoService],
})
export class CardInfoModule {}
