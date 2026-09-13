import { Body, Controller, Get, Header, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CommandsService } from './commands.service.js';
import { enqueueCommandSchema, ackCommandSchema } from './commands.dto.js';
import { parseBody } from '../../shared/http/validation.js';
import { AccountGuard, DeviceGuard } from '../../shared/auth/guards.js';
import { CurrentPrincipal, type Principal } from '../../shared/auth/principal.js';

// Console (account-scoped) command endpoints.
@Controller()
export class CommandsController {
  constructor(private readonly commands: CommandsService) {}

  @Post('devices/:deviceId/commands')
  @UseGuards(AccountGuard)
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  enqueue(@CurrentPrincipal() principal: Principal, @Param('deviceId') deviceId: string, @Body() body: unknown) {
    return this.commands.enqueue(principal, z.uuid().parse(deviceId), parseBody(enqueueCommandSchema, body));
  }

  @Get('devices/:deviceId/commands')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  list(@CurrentPrincipal() principal: Principal, @Param('deviceId') deviceId: string) {
    return this.commands.listForDevice(principal, z.uuid().parse(deviceId));
  }
}

// Agent (device-scoped) command endpoints. Separate /agent prefix avoids /devices route collisions.
@Controller('agent')
export class AgentCommandsController {
  constructor(private readonly commands: CommandsService) {}

  @Get('commands')
  @UseGuards(DeviceGuard)
  @Header('Cache-Control', 'no-store')
  fetch(@CurrentPrincipal() principal: Principal) {
    return this.commands.fetchForAgent(principal);
  }

  @Post('commands/:commandId/ack')
  @UseGuards(DeviceGuard)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  ack(@CurrentPrincipal() principal: Principal, @Param('commandId') commandId: string, @Body() body: unknown) {
    return this.commands.ack(principal, z.uuid().parse(commandId), parseBody(ackCommandSchema, body));
  }
}
