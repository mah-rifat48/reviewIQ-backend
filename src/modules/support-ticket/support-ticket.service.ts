import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';
import { paginate } from '../../common/utils/pagination.util';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class SupportTicketService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {}

  create(createSupportTicketDto: CreateSupportTicketDto, userId?: string) {
    const { userIds, ...data } = createSupportTicketDto;
    
    // Combine provided userIds with the authenticated userId
    const finalUserIds = [...(userIds || [])];
    if (userId && !finalUserIds.includes(userId)) {
      finalUserIds.push(userId);
    }

    return this.prisma.supportTicket.create({
      data: {
        ...data,
        users: finalUserIds.length > 0 ? {
          connect: finalUserIds.map(id => ({ userId: id }))
        } : undefined,
      },
      include: { users: true },
    });
  }

  async findAll(query: SupportTicketQueryDto) {
    const { page, limit, search, sortBy, sortOrder, status, priority, category } = query;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    return paginate(this.prisma.supportTicket, {
      page,
      limit,
      where,
      orderBy,
      include: {
        users: true,
      },
    });
  }

  async findOne(supportTicketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { supportTicketId },
      include: { users: true },
    });
    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${supportTicketId} not found`);
    }
    return ticket;
  }

  async update(supportTicketId: string, updateSupportTicketDto: UpdateSupportTicketDto) {
    const existingTicket = await this.findOne(supportTicketId);
    
    const { userIds, ...data } = updateSupportTicketDto;
    const updatedTicket = await this.prisma.supportTicket.update({
      where: { supportTicketId },
      data: {
        ...data,
        users: userIds ? {
          set: userIds.map(id => ({ userId: id }))
        } : undefined,
      },
      include: { users: true },
    });

    // Send notification if status is updated to RESOLVED
    if (existingTicket.status !== 'RESOLVED' && updatedTicket.status === 'RESOLVED') {
      const feedbackMessage = updatedTicket.feedback 
        ? ` Feedback: ${updatedTicket.feedback}` 
        : '';
        
      for (const user of updatedTicket.users) {
        const createdNotification = await this.prisma.notification.create({
          data: {
            title: 'Support Ticket Resolved',
            description: `Your support ticket "${updatedTicket.subject}" has been resolved.${feedbackMessage}`,
            status: 'INFORMATION',
            userId: user.userId,
          }
        });
        
        // Push real-time event to the connected user
        this.notificationGateway.sendNotification(
          user.userId,
          'newNotification',
          createdNotification
        );
      }
    }

    return updatedTicket;
  }

  remove(supportTicketId: string) {
    return this.prisma.supportTicket.delete({
      where: { supportTicketId },
    });
  }

  async getUserResolvedTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: {
        status: 'RESOLVED',
        users: {
          some: { userId }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getUserTicketsSummary(userId: string) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        users: {
          some: { userId }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalTickets = tickets.length;
    const open = tickets.filter(t => t.status === 'OPEN').length;
    const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter(t => t.status === 'RESOLVED').length;

    return {
      stats: {
        totalTickets,
        open,
        inProgress,
        resolved
      },
      tickets
    };
  }

  async getAdminTicketsSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tickets = await this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      include: { users: true }
    });

    const openCount = await this.prisma.supportTicket.count({ where: { status: 'OPEN' } });
    const inProgressCount = await this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } });
    const resolvedTodayCount = await this.prisma.supportTicket.count({
      where: {
        status: 'RESOLVED',
        updatedAt: { gte: today }
      }
    });

    const urgentTicketsCount = await this.prisma.supportTicket.count({
      where: {
        priority: 'HIGH',
        NOT: { status: 'RESOLVED' }
      }
    });

    return {
      stats: {
        openTickets: openCount,
        inProgress: inProgressCount,
        resolvedToday: resolvedTodayCount,
        urgentTickets: urgentTicketsCount
      },
      tickets
    };
  }
}
