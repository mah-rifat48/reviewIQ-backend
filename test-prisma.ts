import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  try {
    await prisma.subscription.create({
      data: {
        userId: '12345',
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
  } catch (e) {
    console.error(e.message);
  }
}
main();
