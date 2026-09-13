import { Controller, Get, Header, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AccountService } from './account.service.js';
import { AccountGuard } from '../../shared/auth/guards.js';
import { CurrentPrincipal, type Principal } from '../../shared/auth/principal.js';

@Controller()
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('account/me')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  me(@CurrentPrincipal() principal: Principal) {
    return this.account.me(principal.workspaceId, principal.userId);
  }

  @Post('activation/codes')
  @UseGuards(AccountGuard)
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  issueCode(@CurrentPrincipal() principal: Principal) {
    return this.account.issueActivationCode(principal.workspaceId);
  }
}
