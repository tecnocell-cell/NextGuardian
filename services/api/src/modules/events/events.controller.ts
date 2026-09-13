import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { EventsService } from './events.service.js';
import { AccountGuard } from '../../shared/auth/guards.js';
import { CurrentPrincipal, type Principal } from '../../shared/auth/principal.js';

@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get('events')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  recent(@CurrentPrincipal() principal: Principal) {
    return this.events.workspaceRecent(principal.workspaceId);
  }

  @Get('devices/:deviceId/events')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  timeline(@CurrentPrincipal() principal: Principal, @Param('deviceId') deviceId: string) {
    return this.events.deviceTimeline(principal.workspaceId, z.uuid().parse(deviceId));
  }
}
