import { Injectable } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository.js';
import { subscriptionView } from '../../shared/http/serializers.js';
import { serverTime } from '../../shared/http/validation.js';

@Injectable()
export class SubscriptionService {
  constructor(private readonly repo: SubscriptionRepository) {}

  async me(workspaceId: string) {
    const subscription = await this.repo.getForWorkspace(workspaceId);
    return { subscription: subscription ? subscriptionView(subscription) : null, serverTime: serverTime() };
  }
}
