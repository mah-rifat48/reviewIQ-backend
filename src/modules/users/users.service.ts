import { Injectable, NotFoundException, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { paginate } from '../../common/utils/pagination.util';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import * as bcrypt from 'bcrypt';
import { Status } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findAll(query: UserQueryDto) {
    const { page, limit, search, sortBy, sortOrder, role, status } = query;

    const where: any = {};

    if (role) where.role = role;
    if (status) where.status = status;

    if (search && search.trim() !== '') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createAt: 'desc' };

    return paginate(this.prisma.user, {
      page,
      limit,
      where,
      orderBy,
      include: {
        notifications: true,
        subscriptions: true,
        cardInfo: true,
        supportTickets: true,
      },
    });
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        notifications: true,
        subscriptions: true,
        cardInfo: true,
        supportTickets: true,
      }
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    await this.findOne(userId); // Ensure user exists

    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          NOT: { userId: userId },
        },
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const data: any = { ...updateUserDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { userId },
      data,
    });
  }

  async deleteMyAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete associated data first
    await this.prisma.$transaction([
      this.prisma.subscription.deleteMany({ where: { userId } }),
      this.prisma.review.deleteMany({ where: { userId } }),
      this.prisma.notificationSettings.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.cardInfo.deleteMany({ where: { userId } }),
      // Then delete the user
      this.prisma.user.delete({ where: { userId } })
    ]);

    return { message: 'Account and associated data successfully deleted' };
  }

  async remove(userId: string) {
    await this.findOne(userId); // Ensure user exists
    return this.prisma.user.delete({
      where: { userId },
    });
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await this.verifyPassword(oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { userId },
      data: { password: hashedPassword },
    });
  }

  async getStatistics() {
    const now = new Date();

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // 1. Total Users
    const totalUsers = await this.prisma.user.count();
    const currentMonthUsers = await this.prisma.user.count({
      where: { createAt: { gte: currentMonthStart, lte: currentMonthEnd } }
    });
    const previousMonthUsers = await this.prisma.user.count({
      where: { createAt: { gte: previousMonthStart, lte: previousMonthEnd } }
    });
    const totalUsersTrend = currentMonthUsers - previousMonthUsers;

    // 2. Active Users (Percentage)
    const activeUsers = await this.prisma.user.count({ where: { status: 'ACTIVE' } });
    const currentActiveUsers = await this.prisma.user.count({
      where: { status: 'ACTIVE', createAt: { gte: currentMonthStart, lte: currentMonthEnd } }
    });
    const previousActiveUsers = await this.prisma.user.count({
      where: { status: 'ACTIVE', createAt: { gte: previousMonthStart, lte: previousMonthEnd } }
    });
    const activeTrend = previousActiveUsers > 0
      ? ((currentActiveUsers - previousActiveUsers) / previousActiveUsers) * 100
      : (currentActiveUsers > 0 ? 100 : 0);

    // 3. Suspended Users (Percentage)
    const suspendedUsers = await this.prisma.user.count({ where: { status: 'SUSPEND' } });
    const currentSuspendedUsers = await this.prisma.user.count({
      where: { status: 'SUSPEND', createAt: { gte: currentMonthStart, lte: currentMonthEnd } }
    });
    const previousSuspendedUsers = await this.prisma.user.count({
      where: { status: 'SUSPEND', createAt: { gte: previousMonthStart, lte: previousMonthEnd } }
    });
    const suspendedTrend = previousSuspendedUsers > 0
      ? ((currentSuspendedUsers - previousSuspendedUsers) / previousSuspendedUsers) * 100
      : (currentSuspendedUsers > 0 ? 100 : 0);

    return {
      totalUsers: {
        value: totalUsers,
        trend: totalUsersTrend,
        isPercentage: false
      },
      activeUsers: {
        value: activeUsers,
        trend: parseFloat(activeTrend.toFixed(2)),
        isPercentage: true
      },
      suspendedUsers: {
        value: suspendedUsers,
        trend: parseFloat(suspendedTrend.toFixed(2)),
        isPercentage: true
      }
    };
  }

  async getNotificationSettings(userId: string) {
    let settings = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });
    if (!settings) {
      settings = await this.prisma.notificationSettings.create({
        data: { userId },
      });
    }
    return settings;
  }

  async updateNotificationSettings(userId: string, data: UpdateNotificationSettingsDto) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        subscriptions: {
          where: {
            paymentStatus: 'PAID',
            plan: { not: 'NONE' },
            durationDate: { gte: new Date() },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isUserAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const hasActiveSubscription = user.subscriptions.length > 0;

    if (!isUserAdmin && !hasActiveSubscription) {
      throw new ForbiddenException(
        'Only users with an active paid subscription (Starter, Professional, or Custom) can customize notification settings.'
      );
    }

    return this.prisma.notificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  }

  async suspend(userId: string, suspend: boolean) {
    await this.findOne(userId);
    const newStatus = suspend ? Status.SUSPEND : Status.ACTIVE;
    return this.prisma.user.update({
      where: { userId },
      data: { status: newStatus },
    });
  }
}
