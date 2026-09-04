import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const isSslNeeded =
      connectionString?.includes('sslmode=require') ||
      connectionString?.includes('render.com') ||
      process.env.NODE_ENV === 'production';

    const pool = new pg.Pool({
      connectionString,
      ssl: isSslNeeded ? { rejectUnauthorized: false } : false,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
