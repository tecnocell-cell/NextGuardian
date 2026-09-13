import { Body, Controller, Get, Header, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { DevicesService } from './devices.service.js';
import { confirmPairSchema, heartbeatSchema, pairSchema, refreshSchema, revokeSchema } from './devices.dto.js';
import { parseBody } from '../../shared/http/validation.js';
import { bearer, CurrentPrincipal, type Principal } from '../../shared/auth/principal.js';
import { AccountGuard, AccountOrDeviceGuard, DeviceGuard } from '../../shared/auth/guards.js';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  list(@CurrentPrincipal() principal: Principal) {
    return this.devices.list(principal);
  }

  @Post('pair')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  pair(@Headers('authorization') auth: string | undefined, @Body() body: unknown) {
    return this.devices.pair(bearer(auth), parseBody(pairSchema, body));
  }

  @Post('pair/confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  confirm(@Headers('authorization') auth: string | undefined, @Body() body: unknown) {
    return this.devices.confirm(bearer(auth), parseBody(confirmPairSchema, body));
  }

  @Post('session/refresh')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  refresh(@Body() body: unknown) {
    return this.devices.refresh(parseBody(refreshSchema, body));
  }

  @Post('heartbeat')
  @UseGuards(DeviceGuard)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  heartbeat(@CurrentPrincipal() principal: Principal, @Body() body: unknown) {
    return this.devices.heartbeat(principal, parseBody(heartbeatSchema, body));
  }

  @Post('revoke')
  @UseGuards(AccountOrDeviceGuard)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  revoke(@CurrentPrincipal() principal: Principal, @Body() body: unknown) {
    return this.devices.revoke(principal, parseBody(revokeSchema, body));
  }

  @Get('me')
  @UseGuards(DeviceGuard)
  @Header('Cache-Control', 'no-store')
  me(@CurrentPrincipal() principal: Principal) {
    return this.devices.me(principal);
  }
}
