import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Load .env first, then .env.local overrides (local takes priority)
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

export default defineConfig({
  schema: './prisma/schema',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: 'ts-node prisma/seeds/index.ts',
  },
});
