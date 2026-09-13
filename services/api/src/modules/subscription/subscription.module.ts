import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller.js';
import { SubscriptionService } from './subscription.service.js';
import { SubscriptionRepository } from './subscription.repository.js';
import { AccountOrDeviceGuard } from '../../shared/auth/guards.js';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepository, AccountOrDeviceGuard],
})
export class SubscriptionModule {}
