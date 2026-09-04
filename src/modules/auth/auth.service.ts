import { Injectable, UnauthorizedException, BadRequestException, ConflictException, ServiceUnavailableException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerificationDto } from './dto/auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private adminService: AdminService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private prisma: PrismaService,
  ) { }

  async register(registerDto: RegisterDto) {
    const requestedRole = (registerDto as any).role || 'USER';
    const isAdminRole = requestedRole === 'SUPER_ADMIN' || requestedRole === 'ADMIN';


    if (!isAdminRole) {
      const system = await this.prisma.system.findFirst();
      if (system) {
        if (system.isMaintenanceMode) {
          throw new ServiceUnavailableException({
            statusCode: 503,
            message: 'System is under maintenance. Please try again later.',
            error: 'Maintenance Mode',
          });
        }
        if (!system.allowSignups) {
          throw new BadRequestException('New registrations are currently disabled by the administrator.');
        }
      }
    }


    if (isAdminRole) {
      const existingAdmin = await this.prisma.admin.findUnique({
        where: { email: registerDto.email },
      });
      if (existingAdmin) {
        throw new ConflictException('Admin email already exists');
      }

      const plainPassword = registerDto.password;
      const hashedAdminPassword = await bcrypt.hash(plainPassword, 10);
      const admin = await this.prisma.admin.create({
        data: {
          email: registerDto.email,
          password: hashedAdminPassword,
          name: (registerDto as any).name || '',
          role: requestedRole,
        },
      });

      // Send welcome email with login credentials (non-blocking)
      this.mailService
        .sendAdminWelcome(admin.email, {
          name: admin.name,
          email: admin.email,
          password: plainPassword,
        })
        .catch((err) =>
          console.error(`Failed to send admin welcome email to ${admin.email}: ${err.message}`),
        );

      return {
        message: `${requestedRole} account created successfully.`,
        adminId: admin.adminId,
      };
    }


    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }


    const user = await this.prisma.$transaction(async (tx) => {
      // Get system settings for trial duration
      const system = await tx.system.findFirst();
      const trialDays = system?.freeTrialDuration ?? 7;

      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const newUser = await tx.user.create({
        data: {
          ...(registerDto as any),
          password: hashedPassword,
          otp: null,
          isVerified: true,
        },
      });

      await tx.activityLog.create({
        data: {
          title: `New user registration: ${newUser.email}`,
          status: 'new_user',
        },
      });

      if (requestedRole === 'USER') {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        await tx.subscription.create({
          data: {
            userId: newUser.userId,
            plan: 'NONE',
            location: '1',
            business: '1',
            review: '1',
            reportPlan: [],
            competitor: false,
            durationsPlan: 'NONE',
            durationDate: trialEndDate,
            paymentStatus: 'PAID',
          },
        });
      }

      return newUser;
    });

    return this.generateTokens(user.userId, user.email, requestedRole);
  }

  async verify(verificationDto: VerificationDto) {
    const user = await this.usersService.findByEmail(verificationDto.email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {

      return this.generateTokens(user.userId, user.email, 'USER');
    }

    if (user.otp !== parseInt(verificationDto.code, 10)) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.update(user.userId, {
      isVerified: true,
      otp: null,
    } as any);

    if (user.status === 'SUSPEND') {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    return this.generateTokens(user.userId, user.email, 'USER');
  }

  async login(loginDto: LoginDto) {
    let user: any;
    let role: string = loginDto.role || 'USER';

    if (role === 'USER') {
      user = await this.usersService.findByEmail(loginDto.email);

      if (!user && !loginDto.role) {
        user = await this.prisma.admin.findUnique({ where: { email: loginDto.email } });
        if (user) role = user.role;
      }
    } else {

      user = await this.prisma.admin.findUnique({ where: { email: loginDto.email } });
      if (user) role = user.role;
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (role === 'USER' && user.status === 'SUSPEND') {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    if (role === 'USER') {
      const system = await this.prisma.system.findFirst();
      if (system && system.isMaintenanceMode) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          message: 'System is under maintenance. Please try again later.',
          error: 'Maintenance Mode',
        });
      }
    }


    if (role === 'USER' && !user.isVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    // If the account was created via Google, their password is their Google profile ID.
    // Inform them clearly if they are trying to login with an incorrect password.
    if (role === 'USER' && user.googleAuth) {
      const isPasswordValid = await this.usersService.verifyPassword(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException(
          'This account was registered with Google. Use your Google ID as the password, or login with Google.',
        );
      }
    } else {
      const isPasswordValid = await this.usersService.verifyPassword(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    return this.generateTokens(user.userId || user.adminId, user.email, role);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const user = await this.usersService.findOne(payload.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException();
      }

      return this.generateTokens(user.userId, user.email, user.role as any);
    } catch (e) {
      throw new UnauthorizedException();
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    await this.usersService.update(user.userId, {
      resetToken: code,
      resetTokenExpires: expiry,
    } as any);

    await this.mailService.sendPasswordReset(user.email, code);

    return { message: 'Password reset code sent to your email' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.usersService.findByEmail(resetPasswordDto.email);
    if (!user || user.resetToken !== resetPasswordDto.code || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    await this.usersService.update(user.userId, {
      password: resetPasswordDto.newPassword,
      resetToken: null,
      resetTokenExpires: null,
    } as any);

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    await this.usersService.changePassword(
      userId,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  // ── Google Login: only for existing users ────────────────────────────────
  async googleLogin(req: any) {
    if (!req.user) throw new UnauthorizedException('No user from Google');

    const { email } = req.user;

    // Check regular user first
    let user: any = await this.usersService.findByEmail(email);
    let role = 'USER';

    // Check admin
    if (!user) {
      user = await this.prisma.admin.findUnique({ where: { email } });
      if (user) role = user.role;
    } else {
      role = user.role;
    }

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this Google email. Please register first.',
      );
    }

    if (role === 'USER' && user.status === 'SUSPEND') {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    if (role === 'USER') {
      const system = await this.prisma.system.findFirst();
      if (system && system.isMaintenanceMode) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          message: 'System is under maintenance. Please try again later.',
          error: 'Maintenance Mode',
        });
      }
    }

    return this.generateTokens(user.userId || user.adminId, user.email, role);
  }


  async googleRegister(req: any) {
    if (!req.user) throw new UnauthorizedException('No user from Google');

    const { googleId, email, firstName, lastName } = req.user;

    // Check if signups are allowed / maintenance mode is active
    const system = await this.prisma.system.findFirst();
    if (system) {
      if (system.isMaintenanceMode) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          message: 'System is under maintenance. Please try again later.',
          error: 'Maintenance Mode',
        });
      }
      if (!system.allowSignups) {
        throw new BadRequestException('New registrations are currently disabled by the administrator.');
      }
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'An account with this Google email already exists. Please login instead.',
      );
    }

    const existingAdmin = await this.prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      throw new ConflictException('An admin account with this email already exists.');
    }


    const user = await this.prisma.$transaction(async (tx) => {
      // Get system settings for trial duration
      const system = await tx.system.findFirst();
      const trialDays = system?.freeTrialDuration ?? 7;

      const hashedPassword = await bcrypt.hash(googleId, 10);
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          otp: null,
          isVerified: true,
          googleAuth: true,
        } as any,
      });

      await tx.activityLog.create({
        data: {
          title: `New Google registration: ${email}`,
          status: 'new_user',
        },
      });

      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);

      await tx.subscription.create({
        data: {
          userId: newUser.userId,
          location: '1',
          review: '1',
          business: '1',
          reportPlan: [],
          competitor: false,
          plan: 'NONE',
          durationsPlan: 'NONE',
          durationDate: trialEndDate,
          paymentStatus: 'PAID',
        },
      });

      return newUser;
    });

    return this.generateTokens(user.userId, user.email, 'USER');
  }


  private async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.configService.get('jwt.secret'),
          expiresIn: this.configService.get('jwt.expiresIn'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.get('jwt.refreshSecret'),
          expiresIn: this.configService.get('jwt.refreshExpiresIn'),
        },
      ),
    ]);

    if (role === 'USER') {
      await this.usersService.update(userId, { refreshToken } as any);
    } else {
      await this.adminService.update(userId, { refreshToken } as any);
    }


    let subscription: any = null;
    let user: any = null;
    if (role === 'USER') {
      subscription = await this.prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      user = await this.prisma.user.findUnique({
        where: { userId },
        select: { userId: true, email: true, name: true, role: true, status: true, googleAuth: true }
      });
    } else {
      user = await this.prisma.admin.findUnique({
        where: { adminId: userId },
        select: { adminId: true, email: true, name: true, role: true }
      });
    }

    return {
      accessToken,
      refreshToken,
      subscription,
      user,
    };
  }

  async getMe(userId: string, role: string) {
    if (role === 'USER') {
      const user = await this.prisma.user.findUnique({
        where: { userId },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      if (!user) {
        throw new NotFoundException('User profile not found');
      }

      const latestSubscription = user.subscriptions[0] || null;
      const { password, refreshToken, resetToken, otp, subscriptions, ...safeUser } = user;

      return {
        ...safeUser,
        subscription: latestSubscription,
      };
    } else {
      const admin = await this.prisma.admin.findUnique({
        where: { adminId: userId },
      });
      if (!admin) {
        throw new NotFoundException('Admin profile not found');
      }

      const { password, refreshToken, ...safeAdmin } = admin;
      return safeAdmin;
    }
  }
}
