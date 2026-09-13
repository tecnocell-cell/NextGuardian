import { Module } from '@nestjs/common';
import { PolicyController } from './policy.controller.js';
import { PolicyService } from './policy.service.js';
import { RiskService } from './risk.service.js';
import { PolicyRepository } from './policy.repository.js';
import { AccountGuard } from '../../shared/auth/guards.js';

@Module({
  controllers: [PolicyController],
  providers: [PolicyService, RiskService, PolicyRepository, AccountGuard],
})
export class PolicyModule {}
