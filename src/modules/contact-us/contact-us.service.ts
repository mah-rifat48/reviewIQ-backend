import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactUsDto } from './dto/create-contact-us.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactUsService {
  private readonly logger = new Logger(ContactUsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) { }

  async create(createContactUsDto: CreateContactUsDto) {
    try {

      const systemInfo = await this.prisma.system.findFirst({
        select: { supportEmail: true, siteName: true }
      });

      const supportEmail = systemInfo?.supportEmail || 'support@aimalya.com';
      const siteName = systemInfo?.siteName || 'Aimalya';


      await this.mailService.sendContactInquiry(supportEmail, {
        ...createContactUsDto,
        siteName
      });

      return {
        message: 'Inquiry sent successfully.',
        status: 'success',
      };
    } catch (error) {
      this.logger.error(`Failed to send contact inquiry: ${error.message}`);
      throw error;
    }
  }
}
