import { PrismaService } from './src/prisma/prisma.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  
  try {
    const user = await prisma.user.create({
      data: {
        email: 'test' + Date.now() + '@test.com',
        password: 'test',
        name: 'test',
        googleAuth: true,
      }
    });

    await prisma.subscription.create({
      data: {
        userId: user.userId,
        location: '1',
        review: '1',
        business: '1',
        reportPlan: [],
        competitor: false,
        plan: 'NONE',
        durationsPlan: 'NONE',
        durationDate: sevenDays,
        paymentStatus: 'PAID',
      },
    });
    console.log("Success!");
  } catch (e) {
    console.log("EXACT PRISMA ERROR:");
    console.log(e.message);
  } finally {
    await prisma.onModuleDestroy();
  }
}
main();
