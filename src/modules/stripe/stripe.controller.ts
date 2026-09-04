import { Controller, Post, Body, Req, UseGuards, Headers, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CreateCheckoutSessionDto } from './dto/stripe.dto';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-subscription')
  @ApiOperation({ summary: 'Creates a Stripe Checkout Session for a new Subscription' })
  async createSubscription(
    @Req() req: any,
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
  ) {
    return this.stripeService.createCheckoutSession(
      req.user.userId || req.user.sub,
      createCheckoutSessionDto.plan,
      createCheckoutSessionDto.durationsPlan,
    );
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe Webhook handler (Do not hit manually)' })
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    // Note: req.rawBody must be populated in main.ts
    return this.stripeService.handleWebhook(signature, req.rawBody);
  }
}
