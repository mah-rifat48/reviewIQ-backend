import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { paginate } from '../../common/utils/pagination.util';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private static resetTokens = new Map<string, { code: string; expires: Date }>();

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async forgotPassword(email: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    AdminService.resetTokens.set(email.toLowerCase(), { code, expires });
    await this.mailService.sendPasswordReset(admin.email, code);

    return { message: 'Password reset code sent to your admin email' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const key = email.toLowerCase();
    const tokenInfo = AdminService.resetTokens.get(key);

    if (!tokenInfo || tokenInfo.code !== code || tokenInfo.expires < new Date()) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new BadRequestException('Admin not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.admin.update({
      where: { adminId: admin.adminId },
      data: { password: hashedPassword },
    });

    AdminService.resetTokens.delete(key);
    return { message: 'Admin password reset successful' };
  }

  async create(createAdminDto: CreateAdminDto) {
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email: createAdminDto.email },
    });
    if (existingAdmin) {
      throw new ConflictException('Admin email already exists');
    }

    const plainPassword = createAdminDto.password;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const admin = await this.prisma.admin.create({
      data: {
        ...createAdminDto,
        password: hashedPassword,
      },
    });

    // Send welcome email with login credentials
    this.mailService
      .sendAdminWelcome(admin.email, {
        name: admin.name,
        email: admin.email,
        password: plainPassword,
      })
      .catch((err) =>
        this.logger.error(`Failed to send admin welcome email to ${admin.email}: ${err.message}`),
      );

    return admin;
  }

  async findAll(query: AdminQueryDto) {
    const { page, limit, search, sortBy, sortOrder, role } = query;

    const where: any = {};
    if (role) where.role = role;

    if (search && search.trim() !== '') {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' };

    return paginate(this.prisma.admin, {
      page,
      limit,
      where,
      orderBy,
    });
  }

  async findOne(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { adminId },
    });
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${adminId} not found`);
    }
    return admin;
  }

  async update(adminId: string, updateAdminDto: UpdateAdminDto) {
    await this.findOne(adminId);
    const data = { ...updateAdminDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.admin.update({
      where: { adminId },
      data,
    });
  }

  async updateProfile(adminId: string, updateAdminProfileDto: UpdateAdminProfileDto) {
    await this.findOne(adminId);
    const data = { ...updateAdminProfileDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.admin.update({
      where: { adminId },
      data,
    });
  }

  async remove(adminId: string) {
    await this.findOne(adminId);
    try {
      return await this.prisma.admin.delete({
        where: { adminId },
      });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete this admin due to existing related records.');
      }
      throw error;
    }
  }
}
