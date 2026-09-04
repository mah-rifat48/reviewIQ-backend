import { Module } from '@nestjs/common';
import { AutoAnalysesService } from './auto-analyses.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, NotificationModule, MailModule],
  controllers: [],
  providers: [AutoAnalysesService],
  exports: [AutoAnalysesService],
})
export class AutoAnalysesModule {}
