import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { SystemModule } from './modules/system/system.module';
import { ActivityLogModule } from './modules/activity-log/activity-log.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SupportTicketModule } from './modules/support-ticket/support-ticket.module';
import { ContactUsModule } from './modules/contact-us/contact-us.module';
import { CardInfoModule } from './modules/card-info/card-info.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { MailModule } from './modules/mail/mail.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { StripeModule } from './modules/stripe/stripe.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReviewModule } from './modules/review/review.module';
import { AutoAnalysesModule } from './modules/auto-analyses/auto-analyses.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PlanSettingsModule } from './modules/plan-settings/plan-settings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/api/v1/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    AuthModule,
    UsersModule,
    MailModule,
    AdminModule,
    SystemModule,
    ActivityLogModule,
    NotificationModule,
    SupportTicketModule,
    ContactUsModule,
    CardInfoModule,
    SubscriptionModule,
    StripeModule,
    PrismaModule,
    DashboardModule,
    ReviewModule,
    AutoAnalysesModule,
    PlanSettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
  ],
})
export class AppModule {}
