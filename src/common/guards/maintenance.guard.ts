import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {

    const system = await this.prisma.system.findFirst();


    if (!system?.isMaintenanceMode) {
      return true;
    }


    const request = context.switchToHttp().getRequest();
    const url = request.url;


    if (url.includes('/auth/')) {
      return true;
    }

    const user = request.user;

    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      return true;
    }


    throw new ServiceUnavailableException({
      statusCode: 503,
      message: 'System is under maintenance. Please try again later.',
      error: 'Maintenance Mode',
    });
  }
}
