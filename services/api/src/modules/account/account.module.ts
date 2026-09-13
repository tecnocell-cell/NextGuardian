import { Module } from '@nestjs/common';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { AccountRepository } from './account.repository.js';
import { AccountGuard } from '../../shared/auth/guards.js';

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepository, AccountGuard],
})
export class AccountModule {}
