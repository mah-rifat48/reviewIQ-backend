import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('my-billing')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current user billing and subscription info' })
  @ApiResponse({ status: 200, description: 'Return current plan, usage and billing history.' })
  getMyBilling(@GetUser('userId') userId: string) {
    return this.subscriptionService.getMyBilling(userId);
  }

  @Get('my-purchases')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all payments/subscriptions for the current user' })
  @ApiResponse({ status: 200, description: 'Return history of all paid subscriptions.' })
  getMyPurchases(@GetUser('userId') userId: string) {
    return this.subscriptionService.getMyPurchases(userId);
  }

  @Public()
  @Get('success')
  @ApiOperation({ summary: 'Stripe success redirect' })
  @ApiQuery({ name: 'session_id', required: true })
  async success(@Query('session_id') sessionId: string) {
    return {
      message: 'Payment successful! Your subscription is being processed.',
      sessionId,
    };
  }

  @Public()
  @Get('cancel')
  @ApiOperation({ summary: 'Stripe cancel redirect' })
  async cancel() {
    return {
      message: 'Payment cancelled. Please try again when you are ready.',
    };
  }

  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'The subscription has been successfully created.' })
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @GetUser() user: { userId: string; role: string },
  ) {
    return this.subscriptionService.create(createSubscriptionDto, user.userId, user.role);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiResponse({ status: 200, description: 'Return all subscriptions.' })
  findAll(@Query() query: SubscriptionQueryDto) {
    return this.subscriptionService.findAll(query);
  }

  @Get('user-purchases')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get list of users and how many subscriptions they bought' })
  @ApiResponse({ status: 200, description: 'Returns grouping of users and their purchase counts.' })
  getUserPurchases() {
    return this.subscriptionService.getUserPurchases();
  }

  @Get('statistics')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get subscription statistics' })
  @ApiResponse({ status: 200, description: 'Return metrics for subscription dashboard.' })
  getStatistics() {
    return this.subscriptionService.getStatistics();
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get a subscription by id' })
  @ApiResponse({ status: 200, description: 'Return the subscription.' })
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiResponse({ status: 200, description: 'The subscription has been successfully updated.' })
  update(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto) {
    return this.subscriptionService.update(id, updateSubscriptionDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a subscription' })
  @ApiResponse({ status: 200, description: 'The subscription has been successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.subscriptionService.remove(id);
  }
}
