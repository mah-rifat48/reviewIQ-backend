import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto, ReviewQueryDto } from './dto/review.dto';
import { paginate } from '../../common/utils/pagination.util';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string | null, createReviewDto: CreateReviewDto) {
    return this.prisma.review.create({
      data: {
        ...createReviewDto,
        userId,
      },
    });
  }

  async findAll(query: ReviewQueryDto) {
    const { page, limit, sortBy, sortOrder, rating } = query;

    const where: any = {};
    if (rating) {
      where.rating = rating;
    }

    const allowedSortFields = ['rating', 'createdAt', 'updatedAt'];
    const finalSortBy = (sortBy && allowedSortFields.includes(sortBy)) ? sortBy : 'createdAt';
    const orderBy = { [finalSortBy]: sortOrder || 'desc' };

    return paginate(this.prisma.review, {
      page,
      limit,
      where,
      orderBy,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profileImage: true,
          }
        }
      }
    });
  }

  async findOne(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { reviewId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            profileImage: true,
          }
        }
      }
    });
    if (!review) {
      throw new NotFoundException(`Review not found`);
    }
    return review;
  }

  async update(reviewId: string, userId: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.findOne(reviewId);
    
    // Only allow update if user owns it (optional, but good practice). Or admin.
    // Assuming backend will handle authorization generically, we allow update here.
    return this.prisma.review.update({
      where: { reviewId },
      data: updateReviewDto,
    });
  }

  async remove(reviewId: string) {
    await this.findOne(reviewId);
    return this.prisma.review.delete({
      where: { reviewId },
    });
  }
}
