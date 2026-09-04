import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import { paginate } from '../../common/utils/pagination.util';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  create(createActivityLogDto: CreateActivityLogDto) {
    return this.prisma.activityLog.create({
      data: createActivityLogDto,
    });
  }

  async findAll(query: ActivityLogQueryDto) {
    const { page, limit, search, sortBy, sortOrder, status } = query;

    const where: any = {};
    if (status) where.status = status;

    if (search && search.trim() !== '') {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const allowedSortFields = ['title', 'status', 'createdAt', 'updatedAt', 'activityLogId'];
    let finalSortBy = sortBy === 'name' ? 'title' : sortBy;
    if (!finalSortBy || !allowedSortFields.includes(finalSortBy)) {
      finalSortBy = 'createdAt';
    }

    const orderBy = { [finalSortBy]: sortOrder || 'desc' };

    return paginate(this.prisma.activityLog, {
      page,
      limit,
      where,
      orderBy,
    });
  }

  async findOne(activityLogId: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { activityLogId },
    });
    if (!log) {
      throw new NotFoundException(`Activity log with ID ${activityLogId} not found`);
    }
    return log;
  }

  update(activityLogId: string, updateActivityLogDto: UpdateActivityLogDto) {
    return this.prisma.activityLog.update({
      where: { activityLogId },
      data: updateActivityLogDto,
    });
  }

  remove(activityLogId: string) {
    return this.prisma.activityLog.delete({
      where: { activityLogId },
    });
  }
}
