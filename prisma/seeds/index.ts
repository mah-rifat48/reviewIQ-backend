import { PrismaClient, Role, Status, AdminRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'password123';
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  // Create Super Admin if it doesn't exist
  const existingSuperAdmin = await prisma.admin.findFirst({
    where: { role: AdminRole.SUPER_ADMIN },
  });

  if (!existingSuperAdmin) {
    const superAdmin = await prisma.admin.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN,
      },
    });
    console.log(`Created super admin: ${superAdmin.email}`);
  } else {
    console.log('Super admin already exists, skipping seed.');
  }

  // Create default System settings if they don't exist
  const existingSystem = await prisma.system.findFirst();
  if (!existingSystem) {
    const system = await prisma.system.create({
      data: {
        supportEmail: process.env.SYSTEM_SUPPORT_EMAIL || 'support@example.com',
        supportUrl: process.env.SYSTEM_SUPPORT_URL || 'https://support.example.com',
        siteName: process.env.SYSTEM_SITE_NAME || 'Aimalya',
        supportPhone: process.env.SYSTEM_SUPPORT_PHONE || '+1234567890',
        location: process.env.SYSTEM_LOCATION || 'Tech Hub, Silicon Valley',
        freeTrialDuration: parseInt(process.env.SYSTEM_FREE_TRIAL_DURATION || '14', 10),
        planLimitMaxBusiness: parseInt(process.env.SYSTEM_PLAN_LIMIT_MAX_BUSINESS || '5', 10),
        planLimitMaxLocations: parseInt(process.env.SYSTEM_PLAN_LIMIT_MAX_LOCATIONS || '10', 10),
      } as any,
    });
    console.log(`Created default system settings: ${system.siteName}`);
  } else {
    console.log('System settings already exist, skipping seed.');
  }

  // Create default Plan settings if they don't exist
  const existingStarterPlan = await prisma.starterPlan.findFirst();
  if (!existingStarterPlan) {
    await prisma.starterPlan.create({
      data: {
        review: 100,
        location: 10,
        balance: 0.0,
        business: 1,
        reportPlan: [],
        competitor: false,
      },
    });
    console.log('Created default Starter plan settings.');
  } else {
    console.log('Starter plan settings already exist, skipping seed.');
  }

  const existingProfessionalPlan = await prisma.professionalPlan.findFirst();
  if (!existingProfessionalPlan) {
    await prisma.professionalPlan.create({
      data: {
        review: 1000,
        location: 100,
        balance: 100.0,
        business: 1,
        reportPlan: ['Monthly', 'Weekly'],
        competitor: false,
      },
    });
    console.log('Created default Professional plan settings.');
  } else {
    console.log('Professional plan settings already exist, skipping seed.');
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
