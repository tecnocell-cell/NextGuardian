import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service.js';
import { AccountOrDeviceGuard } from '../../shared/auth/guards.js';
import { CurrentPrincipal, type Principal } from '../../shared/auth/principal.js';

@Controller()
export class SubscriptionController {
  constructor(private readonly subscription: SubscriptionService) {}

  @Get('subscription/me')
  @UseGuards(AccountOrDeviceGuard)
  @Header('Cache-Control', 'no-store')
  me(@CurrentPrincipal() principal: Principal) {
    return this.subscription.me(principal.workspaceId);
  }
}
