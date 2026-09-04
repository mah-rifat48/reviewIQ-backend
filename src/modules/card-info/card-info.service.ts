import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCardInfoDto } from './dto/create-card-info.dto';
import { UpdateCardInfoDto } from './dto/update-card-info.dto';
import { CardInfoQueryDto } from './dto/card-info-query.dto';
import { paginate } from '../../common/utils/pagination.util';

@Injectable()
export class CardInfoService {
  constructor(private prisma: PrismaService) {}

  async create(createCardInfoDto: CreateCardInfoDto, userId: string) {
    return this.prisma.cardInfo.upsert({
      where: { userId },
      create: {
        ...createCardInfoDto,
        userId,
      },
      update: {
        ...createCardInfoDto,
      },
    });
  }

  async findAll(query: CardInfoQueryDto) {
    const { page, limit, search, sortBy, sortOrder } = query;

    const where: any = {};

    if (search) {
      where.cardNumber = { contains: search, mode: 'insensitive' };
    }

    // Validate sortBy field to prevent PrismaValidationError and satisfy TypeScript
    const allowedSortFields = ['cardNumber', 'expiryDate', 'createdAt', 'updatedAt'];
    const finalSortBy = (sortBy && allowedSortFields.includes(sortBy)) ? sortBy : 'createdAt';
    const orderBy = { [finalSortBy]: sortOrder };

    return paginate(this.prisma.cardInfo, {
      page,
      limit,
      where,
      orderBy,
    });
  }

  async findOne(cardInfoId: string) {
    const card = await this.prisma.cardInfo.findUnique({
      where: { cardInfoId },
    });
    if (!card) {
      throw new NotFoundException(`Card info with ID ${cardInfoId} not found`);
    }
    return card;
  }

  async update(cardInfoId: string, updateCardInfoDto: UpdateCardInfoDto) {
    await this.findOne(cardInfoId);
    return this.prisma.cardInfo.update({
      where: { cardInfoId },
      data: updateCardInfoDto,
    });
  }

  async remove(cardInfoId: string) {
    await this.findOne(cardInfoId);
    return this.prisma.cardInfo.delete({
      where: { cardInfoId },
    });
  }
}
