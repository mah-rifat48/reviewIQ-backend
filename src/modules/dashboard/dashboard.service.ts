import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getStatistics() {
    const now = new Date();

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);


    const totalUsers = await this.prisma.user.count();
    const currentMonthUsers = await this.prisma.user.count({
      where: { createAt: { gte: currentMonthStart, lte: currentMonthEnd } }
    });
    const previousMonthUsers = await this.prisma.user.count({
      where: { createAt: { gte: previousMonthStart, lte: previousMonthEnd } }
    });
    const userDifference = currentMonthUsers - previousMonthUsers;


    const monthlyRevenueData = await this.prisma.subscription.aggregate({
      _sum: { balance: true },
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: currentMonthStart, lte: currentMonthEnd }
      }
    });
    const previousRevenueData = await this.prisma.subscription.aggregate({
      _sum: { balance: true },
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: previousMonthStart, lte: previousMonthEnd }
      }
    });

    const monthlyRevenue = monthlyRevenueData._sum.balance || 0;
    const previousRevenue = previousRevenueData._sum.balance || 0;
    const revenueTrend = previousRevenue > 0
      ? ((monthlyRevenue - previousRevenue) / previousRevenue) * 100
      : (monthlyRevenue > 0 ? 100 : 0);


    const activeBusinessesCount = await this.prisma.user.count({
      where: {
        subscriptions: {
          some: {
            paymentStatus: 'PAID',
            plan: { not: 'NONE' }
          }
        }
      }
    });

    const currentMonthNewPaid = await this.prisma.user.count({
      where: {
        subscriptions: {
          some: {
            paymentStatus: 'PAID',
            plan: { not: 'NONE' },
            createdAt: { gte: currentMonthStart, lte: currentMonthEnd }
          }
        }
      }
    });

    const previousMonthNewPaid = await this.prisma.user.count({
      where: {
        subscriptions: {
          some: {
            paymentStatus: 'PAID',
            plan: { not: 'NONE' },
            createdAt: { gte: previousMonthStart, lte: previousMonthEnd }
          }
        }
      }
    });

    const activeBusinesses = activeBusinessesCount;
    const businessTrend = currentMonthNewPaid - previousMonthNewPaid;
    const currentBusinesses = currentMonthNewPaid;
    const previousBusinesses = previousMonthNewPaid;

    // 4. Support Tickets (Detailed Stats)
    const totalSupportTickets = await this.prisma.supportTicket.count();
    const currentTickets = await this.prisma.supportTicket.count({
      where: { createdAt: { gte: currentMonthStart, lte: currentMonthEnd } }
    });
    const previousTickets = await this.prisma.supportTicket.count({
      where: { createdAt: { gte: previousMonthStart, lte: previousMonthEnd } }
    });
    const ticketTrend = previousTickets > 0
      ? ((currentTickets - previousTickets) / previousTickets) * 100
      : (currentTickets > 0 ? 100 : 0);

    const openTickets = await this.prisma.supportTicket.count({ where: { status: 'OPEN' } });
    const inProgressTickets = await this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } });
    const resolvedToday = await this.prisma.supportTicket.count({
      where: {
        status: 'RESOLVED',
        updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });

    // 4a. Average Response Time (SLA)
    const resolvedTickets = await this.prisma.supportTicket.findMany({
      where: { status: 'RESOLVED' },
      select: { createdAt: true, updatedAt: true }
    });

    let avgResponseTime = "0h";
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((acc, ticket) => {
        return acc + (ticket.updatedAt.getTime() - ticket.createdAt.getTime());
      }, 0);
      const avgMs = totalTime / resolvedTickets.length;
      const avgHours = (avgMs / (1000 * 60 * 60)).toFixed(1);
      avgResponseTime = `${avgHours}h`;
    }

    // 5. Churn Rate
    const totalSuspendedUsers = await this.prisma.user.count({ where: { status: 'SUSPEND' } });
    const overallChurnRate = totalUsers > 0 ? (totalSuspendedUsers / totalUsers) * 100 : 0;

    const currentMonthSuspended = await this.prisma.user.count({
      where: { status: 'SUSPEND', updatedAt: { gte: currentMonthStart, lte: currentMonthEnd } }
    });
    const previousMonthSuspended = await this.prisma.user.count({
      where: { status: 'SUSPEND', updatedAt: { gte: previousMonthStart, lte: previousMonthEnd } }
    });

    const churnThisMonth = currentMonthUsers > 0 ? (currentMonthSuspended / currentMonthUsers) * 100 : 0;
    const churnLastMonth = previousMonthUsers > 0 ? (previousMonthSuspended / previousMonthUsers) * 100 : 0;
    const churnTrend = churnThisMonth - churnLastMonth;

    return {
      totalUsers: {
        value: totalUsers,
        trend: userDifference,
        isPercentage: false
      },
      monthlyRevenue: {
        value: monthlyRevenue,
        trend: parseFloat(revenueTrend.toFixed(2)),
        isPercentage: true
      },
      activeBusinesses: {
        value: activeBusinesses,
        trend: businessTrend > 100 ? (currentBusinesses - previousBusinesses) : parseFloat(businessTrend.toFixed(2)),
        isPercentage: false
      },
      supportTickets: {
        value: totalSupportTickets,
        trend: parseFloat(ticketTrend.toFixed(2)),
        isPercentage: true,
        details: {
          open: openTickets,
          inProgress: inProgressTickets,
          resolvedToday: resolvedToday,
          avgResponseTime: avgResponseTime
        }
      },
      churnRate: {
        value: parseFloat(overallChurnRate.toFixed(2)),
        trend: parseFloat(churnTrend.toFixed(2)),
        isPercentage: true
      }
    };
  }

  async getChartData() {
    // 1. Plan Distribution
    const planDistributionData = await this.prisma.subscription.groupBy({
      by: ['plan'],
      _count: {
        plan: true,
      }
    });

    const planDistribution = planDistributionData.map(item => ({
      name: item.plan,
      value: item._count.plan
    }));

    // 2. Revenue & User Growth
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const recentSubscriptions = await this.prisma.subscription.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: sixMonthsAgo }
      },
      select: { createdAt: true, balance: true }
    });

    const recentUsers = await this.prisma.user.findMany({
      where: {
        createAt: { gte: sixMonthsAgo }
      },
      select: { createAt: true }
    });

    const recentSuspended = await this.prisma.user.findMany({
      where: {
        status: 'SUSPEND',
        updatedAt: { gte: sixMonthsAgo }
      },
      select: { updatedAt: true }
    });

    const recentReviews = await this.prisma.review.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo }
      },
      select: { createdAt: true }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const growthData: { month: string, year: number, revenue: number, users: number, churn: number, reviews: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      growthData.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        revenue: 0,
        users: 0,
        churn: 0,
        reviews: 0,
      });
    }

    recentSubscriptions.forEach(sub => {
      const subMonth = sub.createdAt.getMonth();
      const subYear = sub.createdAt.getFullYear();
      const item = growthData.find(g => g.month === monthNames[subMonth] && g.year === subYear);
      if (item) {
        item.revenue += (sub.balance || 0);
      }
    });

    recentUsers.forEach(user => {
      const userMonth = user.createAt.getMonth();
      const userYear = user.createAt.getFullYear();
      const item = growthData.find(g => g.month === monthNames[userMonth] && g.year === userYear);
      if (item) {
        item.users += 1;
      }
    });

    recentSuspended.forEach(user => {
      const userMonth = user.updatedAt.getMonth();
      const userYear = user.updatedAt.getFullYear();
      const item = growthData.find(g => g.month === monthNames[userMonth] && g.year === userYear);
      if (item) {
        item.churn += 1;
      }
    });

    recentReviews.forEach(review => {
      const reviewMonth = review.createdAt.getMonth();
      const reviewYear = review.createdAt.getFullYear();
      const item = growthData.find(g => g.month === monthNames[reviewMonth] && g.year === reviewYear);
      if (item) {
        item.reviews += 1;
      }
    });

    return {
      planDistribution,
      revenueGrowth: growthData.map(({ month, revenue, users, churn, reviews }) => ({ month, revenue, users, churn, reviews }))
    };
  }

  async getConversionFunnel() {
    // 1. Signups
    const signups = await this.prisma.user.count({ where: { role: 'USER' } });


    const completedOnboarding = 0;


    const startedTrial = await this.prisma.user.count({
      where: { role: 'USER', subscriptions: { some: { plan: 'NONE' } } }
    });


    const convertedToPaid = await this.prisma.user.count({
      where: { role: 'USER', subscriptions: { some: { plan: { not: 'NONE' }, paymentStatus: 'PAID' } } }
    });

    const calculatePercentage = (value: number) => signups > 0 ? Math.round((value / signups) * 100) : 0;

    return {
      signups: {
        value: signups
      },
      completedOnboarding: {
        value: completedOnboarding,
        percentage: calculatePercentage(completedOnboarding)
      },
      startedTrial: {
        value: startedTrial,
        percentage: calculatePercentage(startedTrial)
      },
      convertedToPaid: {
        value: convertedToPaid,
        percentage: calculatePercentage(convertedToPaid)
      },
      overallConversionRate: calculatePercentage(convertedToPaid),
      conversionText: `${convertedToPaid} out of ${signups} signups converted`
    };
  }

  async getSubscriptionManagement() {
    const now = new Date();
    const totalUsersCount = await this.prisma.user.count({ where: { role: 'USER' } });

    // 1. Fetch all active paid subscriptions for MRR calculation
    const paidSubscriptions = await this.prisma.subscription.findMany({
      where: {
        paymentStatus: 'PAID',
        plan: { not: 'NONE' },
        durationDate: { gte: now } // Only current active ones
      }
    });

    let totalMRR = 0;
    paidSubscriptions.forEach(sub => {
      let monthlyContribution = sub.balance || 0;
      if (sub.durationsPlan === 'SIX_MONTHS') monthlyContribution /= 6;
      else if (sub.durationsPlan === 'YEARLY') monthlyContribution /= 12;
      totalMRR += monthlyContribution;
    });

    // 2. Counts
    const activeCount = await this.prisma.subscription.count({
      where: { paymentStatus: 'PAID', plan: { not: 'NONE' }, durationDate: { gte: now } }
    });

    const trialCount = await this.prisma.subscription.count({
      where: { plan: 'NONE', durationDate: { gte: now } }
    });

    const pastDueCount = await this.prisma.subscription.count({
      where: {
        OR: [
          { paymentStatus: 'FAILED' },
          { paymentStatus: 'PAID', durationDate: { lt: now } } // Technically expired
        ]
      }
    });

    // 3. MRR Growth Chart (Last 6 months)
    const chartData = await this.getChartData();

    // 4. Recent Subscriptions Table
    const recentSubscriptions = await this.prisma.subscription.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profileImage: true
          }
        }
      }
    });

    const tableData = recentSubscriptions.map(sub => ({
      user: {
        name: sub.user.name,
        email: sub.user.email,
        image: sub.user.profileImage
      },
      plan: sub.plan,
      status: sub.paymentStatus === 'PAID' ? (sub.durationDate >= now ? 'Active' : 'Expired') : 'Past Due',
      amount: sub.balance,
      billingCycle: sub.durationsPlan.toLowerCase(),
      nextBilling: sub.durationDate,
      subscriptionId: sub.subscriptionId
    }));

    // Previous month MRR for trend
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const prevPaidSubs = await this.prisma.subscription.findMany({
      where: {
        paymentStatus: 'PAID',
        plan: { not: 'NONE' },
        createdAt: { lte: previousMonthEnd }
      }
    });

    let prevMRR = 0;
    prevPaidSubs.forEach(sub => {
      let monthlyContribution = sub.balance || 0;
      if (sub.durationsPlan === 'SIX_MONTHS') monthlyContribution /= 6;
      else if (sub.durationsPlan === 'YEARLY') monthlyContribution /= 12;
      prevMRR += monthlyContribution;
    });

    const mrrTrend = prevMRR > 0 ? ((totalMRR - prevMRR) / prevMRR) * 100 : 0;

    return {
      stats: {
        totalMRR: {
          value: parseFloat(totalMRR.toFixed(2)),
          trend: parseFloat(mrrTrend.toFixed(2))
        },
        active: {
          value: activeCount,
          percentage: totalUsersCount > 0 ? Math.round((activeCount / totalUsersCount) * 100) : 0
        },
        trial: {
          value: trialCount,
          subtext: `${trialCount} converting soon`
        },
        pastDue: {
          value: pastDueCount,
          subtext: 'Needs attention'
        }
      },
      revenueChart: chartData.revenueGrowth,
      subscriptions: tableData
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: 'USER' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return users.map(user => {
      const latestSub = user.subscriptions[0];

      // Calculate MRR contribution
      let mrr = 0;
      if (latestSub && latestSub.paymentStatus === 'PAID') {
        mrr = latestSub.balance || 0;
        if (latestSub.durationsPlan === 'SIX_MONTHS') mrr /= 6;
        else if (latestSub.durationsPlan === 'YEARLY') mrr /= 12;
      }

      return {
        userId: user.userId,
        user: {
          name: user.name,
          email: user.email,
          image: user.profileImage
        },
        status: user.status, // ACTIVE, SUSPEND
        plan: latestSub ? latestSub.plan : 'NONE',
        businesses: {
          count: latestSub?.business || "1",
          locations: latestSub?.location || "1"
        },
        mrr: `${mrr.toFixed(2)}/mo`,
        lastActive: user.updatedAt,
        role: user.role
      };
    });
  }
}
