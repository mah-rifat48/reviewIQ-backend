import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { paginate } from '../../common/utils/pagination.util';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: createNotificationDto,
    });
  }

  async findAll(query: NotificationQueryDto, userId?: string) {
    const { page, limit, search, sortBy, sortOrder, status, isRead } = query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (isRead !== undefined) where.isRead = isRead;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = ['notificationId', 'status', 'isRead', 'title', 'description', 'userId', 'createdAt', 'updatedAt'];
    const actualSortBy = (sortBy && allowedSortFields.includes(sortBy)) ? sortBy : 'createdAt';
    const orderBy = { [actualSortBy]: sortOrder || 'desc' };

    return paginate(this.prisma.notification, {
      page,
      limit,
      where,
      orderBy,
    });
  }

  async findOne(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { notificationId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }
    return notification;
  }

  update(notificationId: string, updateNotificationDto: UpdateNotificationDto) {
    return this.prisma.notification.update({
      where: { notificationId },
      data: updateNotificationDto,
    });
  }

  remove(notificationId: string) {
    return this.prisma.notification.delete({
      where: { notificationId },
    });
  }
}
