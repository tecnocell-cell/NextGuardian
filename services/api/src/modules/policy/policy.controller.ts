import { Body, Controller, Get, Header, Param, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { PolicyService } from './policy.service.js';
import { RiskService } from './risk.service.js';
import { updatePolicySchema } from './policy.dto.js';
import { parseBody } from '../../shared/http/validation.js';
import { AccountGuard } from '../../shared/auth/guards.js';
import { CurrentPrincipal, type Principal } from '../../shared/auth/principal.js';

@Controller()
export class PolicyController {
  constructor(private readonly policy: PolicyService, private readonly risk: RiskService) {}

  @Get('policy')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  get(@CurrentPrincipal() principal: Principal) {
    return this.policy.get(principal.workspaceId);
  }

  @Put('policy')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  update(@CurrentPrincipal() principal: Principal, @Body() body: unknown) {
    return this.policy.update(principal.workspaceId, parseBody(updatePolicySchema, body));
  }

  @Get('risk')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  workspaceRisk(@CurrentPrincipal() principal: Principal) {
    return this.risk.workspaceRisk(principal.workspaceId);
  }

  @Get('devices/:deviceId/risk')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  deviceRisk(@CurrentPrincipal() principal: Principal, @Param('deviceId') deviceId: string) {
    return this.risk.deviceRisk(principal.workspaceId, z.uuid().parse(deviceId));
  }
}
