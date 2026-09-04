import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleLoginStrategy } from './strategies/google-login.strategy';
import { GoogleRegisterStrategy } from './strategies/google-register.strategy';
import { MailModule } from '../mail/mail.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    UsersModule,
    AdminModule,
    PassportModule,
    MailModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleLoginStrategy, GoogleRegisterStrategy],
  exports: [AuthService],
})
export class AuthModule {}
