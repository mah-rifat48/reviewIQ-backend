import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { paginate } from '../../common/utils/pagination.util';
import { StripeService } from '../stripe/stripe.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { MailService } from '../mail/mail.service';

import { SubscriptionPlan } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private notificationGateway: NotificationGateway,
    private mailService: MailService,
  ) { }

  async create(createSubscriptionDto: CreateSubscriptionDto, loggedInUserId: string, loggedInUserRole: string) {
    const isEnterprise = createSubscriptionDto.plan === SubscriptionPlan.ENTERPRISE;
    const isAdmin = loggedInUserRole === 'ADMIN' || loggedInUserRole === 'SUPER_ADMIN';

    let targetUserId = loggedInUserId;

    if (isEnterprise || isAdmin) {
      if (!createSubscriptionDto.userId) {
        throw new BadRequestException('userId is required for Enterprise plan or when created by an admin.');
      }
      targetUserId = createSubscriptionDto.userId;

      // Verify target user exists
      const userExists = await this.prisma.user.findUnique({
        where: { userId: targetUserId },
      });
      if (!userExists) {
        throw new BadRequestException('Target user not found.');
      }
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: targetUserId,
        plan: { not: SubscriptionPlan.NONE },
        paymentStatus: 'PAID',
        durationDate: {
          gte: new Date(),
        },
      },
    });

    if (activeSubscription) {
      const isUpgrading = activeSubscription.plan === SubscriptionPlan.STARTER &&
        (createSubscriptionDto.plan === SubscriptionPlan.PROFESSIONAL || createSubscriptionDto.plan === SubscriptionPlan.ENTERPRISE);

      if (!isUpgrading) {
        throw new BadRequestException('You already have an active subscription. Duplication subscription is not allowed.');
      }
    }

    // Check if the user has previously converted from STARTER to PROFESSIONAL/ENTERPRISE
    // and is trying to purchase within 1 month of that conversion.
    const paidSubscriptions = await this.prisma.subscription.findMany({
      where: {
        userId: targetUserId,
        paymentStatus: 'PAID',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasStarter = paidSubscriptions.some(sub => sub.plan === SubscriptionPlan.STARTER);
    const hasProOrEnterprise = paidSubscriptions.some(
      sub => sub.plan === SubscriptionPlan.PROFESSIONAL || sub.plan === SubscriptionPlan.ENTERPRISE
    );

    if (hasStarter && hasProOrEnterprise) {
      const latestProOrEnterprise = paidSubscriptions.find(
        sub => sub.plan === SubscriptionPlan.PROFESSIONAL || sub.plan === SubscriptionPlan.ENTERPRISE
      );
      if (latestProOrEnterprise) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        if (latestProOrEnterprise.createdAt > oneMonthAgo) {
          throw new BadRequestException('You must wait 1 month after converting your subscription before you can purchase again.');
        }
      }
    }

    if (createSubscriptionDto.plan === 'PROFESSIONAL' || createSubscriptionDto.plan === "STARTER") {
      return this.stripeService.createCheckoutSession(
        targetUserId,
        createSubscriptionDto.plan,
        createSubscriptionDto.durationsPlan || 'MONTHLY',
        createSubscriptionDto.balance,
        createSubscriptionDto.review,
        createSubscriptionDto.reportPlan,
        createSubscriptionDto.competitor,
      );
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        plan: createSubscriptionDto.plan,
        review: createSubscriptionDto.review,
        location: createSubscriptionDto.location,
        balance: createSubscriptionDto.balance || 0,
        business: createSubscriptionDto.business != null ? String(createSubscriptionDto.business) : undefined,
        reportPlan: createSubscriptionDto.reportPlan || [],
        competitor: createSubscriptionDto.competitor || false,
        durationDate: new Date(createSubscriptionDto.durationDate),
        durationsPlan: createSubscriptionDto.durationsPlan,
        userId: targetUserId,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        title: `Payment/Subscription created: ${createSubscriptionDto.plan}`,
        status: 'payment',
      },
    });


    this.notificationGateway.sendNotification(targetUserId, 'subscriptionCreated', {
      message: `Your ${createSubscriptionDto.plan} subscription has been created.`,
      plan: createSubscriptionDto.plan,
    });


    this.notificationGateway.broadcastToAdmins('adminNotification', {
      type: 'SUBSCRIPTION',
      title: 'New Subscription Created',
      message: `A new ${createSubscriptionDto.plan} subscription was created.`,
      userId: targetUserId
    });

    // Send Email Notifications if enabled
    const system = await this.prisma.system.findFirst();
    if (system?.emailNotifications) {
      const admins = await this.prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      });

      const customer = await this.prisma.user.findUnique({ where: { userId: targetUserId } });

      for (const admin of admins) {
        await this.mailService.sendPaymentNotification(admin.email, {
          customerName: customer?.name || 'Unknown',
          customerEmail: customer?.email || 'Unknown',
          plan: createSubscriptionDto.plan || SubscriptionPlan.NONE,
          amount: createSubscriptionDto.balance || 0
        });
      }
    }

    return subscription;
  }

  async findAll(query: SubscriptionQueryDto) {
    const { page, limit, sortBy, sortOrder, plan, paymentStatus, durationsPlan } = query;

    const where: any = {};
    if (plan) where.plan = plan;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (durationsPlan) where.durationsPlan = durationsPlan;

    let orderBy: any = { createdAt: 'desc' };
    const allowedSortFields = ['plan', 'balance', 'durationsPlan', 'createdAt', 'updatedAt', 'paymentStatus'];

    if (sortBy === 'name') {
      orderBy = { user: { name: sortOrder || 'asc' } };
    } else if (sortBy && allowedSortFields.includes(sortBy)) {
      orderBy = { [sortBy]: sortOrder || 'desc' };
    }

    return paginate(this.prisma.subscription, {
      page,
      limit,
      where,
      orderBy,
      include: {
        user: true,
      }
    });
  }

  async getUserPurchases() {
    const data = await this.prisma.user.findMany({
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    const mapped = data.map(u => ({
      userId: u.userId,
      name: u.name,
      email: u.email,
      role: u.role,
      totalPurchases: u._count.subscriptions
    }));

    return mapped.sort((a, b) => b.totalPurchases - a.totalPurchases);
  }

  async findOne(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { subscriptionId },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }
    return subscription;
  }

  update(subscriptionId: string, updateSubscriptionDto: UpdateSubscriptionDto) {
    return this.prisma.subscription.update({
      where: { subscriptionId },
      data: updateSubscriptionDto,
    });
  }

  async getStatistics() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);


    const currentMRRData = await this.prisma.subscription.aggregate({
      _sum: { balance: true },
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
      }
    });
    const previousMRRData = await this.prisma.subscription.aggregate({
      _sum: { balance: true },
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
      }
    });

    const currentMRR = currentMRRData._sum.balance || 0;
    const previousMRR = previousMRRData._sum.balance || 0;
    const mrrTrend = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : (currentMRR > 0 ? 100 : 0);

    // 2. Active Subscriptions
    const totalSubscriptions = await this.prisma.subscription.count();
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { paymentStatus: 'PAID', durationDate: { gte: now } }
    });
    const activePercentage = totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0;

    // 3. Trial Subscriptions
    const trialSubscriptions = await this.prisma.subscription.count({
      where: { plan: 'NONE', durationDate: { gte: now } }
    });
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const convertingSoon = await this.prisma.subscription.count({
      where: { plan: 'NONE', durationDate: { gte: now, lte: threeDaysFromNow } }
    });

    // 4. Past Due Subscriptions
    const pastDueSubscriptions = await this.prisma.subscription.count({
      where: {
        OR: [
          { paymentStatus: 'FAILED' },
          { durationDate: { lt: now }, plan: { not: 'NONE' } }
        ]
      }
    });

    // Chart Data (Last 6 months MRR)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const recentSubscriptions = await this.prisma.subscription.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: sixMonthsAgo }
      },
      select: { createdAt: true, balance: true }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueGrowth: { month: string, year: number, revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueGrowth.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        revenue: 0,
      });
    }

    recentSubscriptions.forEach(sub => {
      const subMonth = sub.createdAt.getMonth();
      const subYear = sub.createdAt.getFullYear();
      const item = revenueGrowth.find(g => g.month === monthNames[subMonth] && g.year === subYear);
      if (item) {
        item.revenue += (sub.balance || 0);
      }
    });

    return {
      totalMRR: {
        value: currentMRR,
        trend: parseFloat(mrrTrend.toFixed(2)),
      },
      active: {
        value: activeSubscriptions,
        percentageOfTotal: parseFloat(activePercentage.toFixed(2)),
      },
      trial: {
        value: trialSubscriptions,
        convertingSoon,
      },
      pastDue: {
        value: pastDueSubscriptions,
      },
      revenueGrowth,
    };
  }

  async getMyBilling(userId: string) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Fetch User with current subscription and card info
    const user = await this.prisma.user.findUnique({
      where: { userId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
        },
        cardInfo: true,
      }
    });

    if (!user) throw new NotFoundException('User not found');

    const activeSub = user.subscriptions.find(sub =>
      sub.paymentStatus === 'PAID' && sub.durationDate >= now && sub.plan !== 'NONE'
    );

    // 2. Usage calculation
    const reviewsThisMonth = await this.prisma.review.count({
      where: {
        userId,
        createdAt: { gte: currentMonthStart }
      }
    });

    // 3. Mapping response
    return {
      currentPlan: activeSub ? {
        plan: activeSub.plan,
        price: activeSub.balance,
        billingCycle: activeSub.durationsPlan.toLowerCase(),
        features: activeSub.plan === 'PROFESSIONAL' ? 'Up to 5 locations, unlimited reviews' : 'Basic features'
      } : null,
      usage: {
        locations: {
          used: activeSub ? parseInt(activeSub.location || "1") : 0,
          limit: activeSub?.plan === 'PROFESSIONAL' ? 5 : 1
        },
        reviews: {
          used: reviewsThisMonth,
          limit: activeSub?.plan === 'PROFESSIONAL' ? 'Unlimited' : 100
        }
      },
      paymentMethod: user.cardInfo ? {
        brand: 'Visa', // Placeholder if not in model
        last4: user.cardInfo.cardNumber?.slice(-4) || '4242',
        expiry: user.cardInfo.expiryDate
      } : null,
      billingHistory: user.subscriptions
        .filter(sub => sub.paymentStatus === 'PAID')
        .map(sub => ({
          date: sub.createdAt,
          amount: sub.balance,
          status: 'Paid',
          subscriptionId: sub.subscriptionId
        })),
      subscriptions: user.subscriptions
    };
  }

  async getMyPurchases(userId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        paymentStatus: 'PAID'
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      totalPayments: subscriptions.length,
      history: subscriptions.map(sub => ({
        subscriptionId: sub.subscriptionId,
        plan: sub.plan,
        amount: sub.balance,
        date: sub.createdAt,
        billingCycle: sub.durationsPlan,
        status: 'PAID'
      }))
    };
  }

  remove(subscriptionId: string) {
    return this.prisma.subscription.delete({
      where: { subscriptionId },
    });
  }
}
