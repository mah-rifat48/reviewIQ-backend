import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { NotificationGateway } from '../notification/notification.gateway';
import { MailService } from '../mail/mail.service';

@Injectable()
export class StripeService {
  private stripe: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
    private mailService: MailService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16' as any,
      });
    }
  }

  async createCheckoutSession(userId: string, plan: string, durationPlan: string, amount?: number, review?: string, reportPlan?: string[], competitor?: boolean) {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured properly');
    }


    const durationDate = new Date();
    if (durationPlan === 'MONTHLY') durationDate.setMonth(durationDate.getMonth() + 1);
    else if (durationPlan === 'YEARLY') durationDate.setFullYear(durationDate.getFullYear() + 1);
    else if (durationPlan === 'SIX_MONTHS') durationDate.setMonth(durationDate.getMonth() + 6);

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        plan: plan as any,
        durationsPlan: durationPlan as any,
        review,
        reportPlan: reportPlan || [],
        competitor: competitor || false,
        durationDate,
        paymentStatus: 'FAILED',
        balance: amount || 0,
      },
    });


    const priceMap: Record<string, number> = {
      STARTER: 1500,
      PROFESSIONAL: 4500,
      ENTERPRISE: 9900,
    };


    let finalAmountCents = 0;
    if (amount) {
      finalAmountCents = Math.round(amount * 100);
    } else {
      let baseAmount = (priceMap[plan] || 0);
      if (durationPlan === 'YEARLY') baseAmount *= 10;
      else if (durationPlan === 'SIX_MONTHS') baseAmount *= 5;
      finalAmountCents = baseAmount;
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Subscription: ${plan} (${durationPlan})`,
              },
              unit_amount: finalAmountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.configService.get<string>('STRIPE_SUCCESS_URL')}?session_id={CHECKOUT_SESSION_ID}&subscriptionId=${subscription.subscriptionId}&plan=${plan}&userId=${userId}`,
        cancel_url: `${this.configService.get<string>('STRIPE_CANCEL_URL')}?error=payment_failed&subscriptionId=${subscription.subscriptionId}`,
        metadata: {
          subscriptionId: subscription.subscriptionId,
          userId,
          plan,
        },
      });


      await this.prisma.subscription.update({
        where: { subscriptionId: subscription.subscriptionId },
        data: { stripeSessionId: session.id },
      });

      return { url: session.url };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create Stripe session: ' + error.message);
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const subscriptionId = session.metadata?.subscriptionId;
        const plan = session.metadata?.plan;

        if (subscriptionId && (plan === 'PROFESSIONAL' || plan === 'STARTER')) {
          const systemInfo = await this.prisma.system.findFirst();

          const updateData: any = {
            paymentStatus: 'PAID',
          };

          // if (plan === 'STARTER') {
          //   updateData.location = '1';
          //   updateData.business = '1';
          // } else {
          //   updateData.location = systemInfo?.planLimitMaxLocations != null ? String(systemInfo.planLimitMaxLocations) : null;
          //   updateData.business = systemInfo?.planLimitMaxBusiness != null ? String(systemInfo.planLimitMaxBusiness) : null;
          // }

          const sub = await this.prisma.subscription.update({
            where: { subscriptionId },
            data: updateData,
          });

          await this.prisma.activityLog.create({
            data: {
              title: `Payment completed for subscription: ${sub.plan}`,
              status: 'payment',
            },
          });

          // Create Notification in Database for the user
          const userNotification = await this.prisma.notification.create({
            data: {
              userId: sub.userId,
              title: `Subscription Active: ${sub.plan}`,
              description: `Congratulations! Your ${sub.plan} subscription is now active.`,
              status: 'INFORMATION',
            }
          });

          // Send real-time notification
          this.notificationGateway.sendNotification(sub.userId, 'paymentSuccess', {
            notificationId: userNotification.notificationId,
            message: `Congratulations! Your ${sub.plan} subscription is now active.`,
            plan: sub.plan,
            amount: sub.balance,
          });

          // Get admins to create database notifications and optionally send emails
          const system = await this.prisma.system.findFirst();
          const admins = await this.prisma.user.findMany({
            where: {
              role: { in: ['ADMIN', 'SUPER_ADMIN'] }
            }
          });

          // Create Notification in Database for admins
          for (const admin of admins) {
            await this.prisma.notification.create({
              data: {
                userId: admin.userId,
                title: 'New Payment Received',
                description: `A user just paid for the ${sub.plan} plan. Amount: $${sub.balance}`,
                status: 'INFORMATION',
              }
            });
          }

          // Also notify admins
          this.notificationGateway.broadcastToAdmins('adminNotification', {
            type: 'PAYMENT',
            title: 'New Payment Received',
            message: `A user just paid for the ${sub.plan} plan.`,
            amount: sub.balance,
            userId: sub.userId
          });

          // Send Email Notifications if enabled
          if (system?.emailNotifications) {

            const customer = await this.prisma.user.findUnique({ where: { userId: sub.userId } });

            for (const admin of admins) {
              await this.mailService.sendPaymentNotification(admin.email, {
                customerName: customer?.name || 'Unknown',
                customerEmail: customer?.email || 'Unknown',
                plan: sub.plan,
                amount: sub.balance
              });
            }
          }
        }

        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as any;
        const subscriptionId = session.metadata?.subscriptionId;

        if (subscriptionId) {
          const sub = await this.prisma.subscription.update({
            where: { subscriptionId },
            data: { paymentStatus: 'FAILED' },
          });

          await this.prisma.activityLog.create({
            data: {
              title: `Payment failed for subscription: ${sub.plan}`,
              status: 'payment',
            },
          });
        }
        break;
      }
      // Handle other events as needed
    }

    return { received: true };
  }
}
