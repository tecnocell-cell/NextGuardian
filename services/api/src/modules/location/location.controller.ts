import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { LocationService } from './location.service.js';
import { createGeofenceSchema, reportLocationsSchema, updateGeofenceSchema } from './location.dto.js';
import { parseBody } from '../../shared/http/validation.js';
import { AccountGuard, DeviceGuard } from '../../shared/auth/guards.js';
import { MinRole, RolesGuard } from '../../shared/auth/roles.js';
import { CurrentPrincipal, type Principal } from '../../shared/auth/principal.js';

// Console (account-scoped) location and geofence endpoints.
@Controller()
export class LocationController {
  constructor(private readonly location: LocationService) {}

  @Get('devices/:deviceId/locations')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  history(@CurrentPrincipal() principal: Principal, @Param('deviceId') deviceId: string) {
    return this.location.history(principal, z.uuid().parse(deviceId));
  }

  @Get('geofences')
  @UseGuards(AccountGuard)
  @Header('Cache-Control', 'no-store')
  list(@CurrentPrincipal() principal: Principal) {
    return this.location.listGeofences(principal);
  }

  @Post('geofences')
  @UseGuards(AccountGuard, RolesGuard)
  @MinRole('ADMIN')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  create(@CurrentPrincipal() principal: Principal, @Body() body: unknown) {
    return this.location.createGeofence(principal, parseBody(createGeofenceSchema, body));
  }

  @Put('geofences/:geofenceId')
  @UseGuards(AccountGuard, RolesGuard)
  @MinRole('ADMIN')
  @Header('Cache-Control', 'no-store')
  update(@CurrentPrincipal() principal: Principal, @Param('geofenceId') geofenceId: string, @Body() body: unknown) {
    return this.location.updateGeofence(principal, z.uuid().parse(geofenceId), parseBody(updateGeofenceSchema, body));
  }

  @Delete('geofences/:geofenceId')
  @UseGuards(AccountGuard, RolesGuard)
  @MinRole('ADMIN')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  remove(@CurrentPrincipal() principal: Principal, @Param('geofenceId') geofenceId: string) {
    return this.location.deleteGeofence(principal, z.uuid().parse(geofenceId));
  }
}

// Agent (device-scoped) ingest. Separate /agent prefix avoids /devices route collisions.
@Controller('agent')
export class AgentLocationController {
  constructor(private readonly location: LocationService) {}

  @Post('locations')
  @UseGuards(DeviceGuard)
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  report(@CurrentPrincipal() principal: Principal, @Body() body: unknown) {
    return this.location.report(principal, parseBody(reportLocationsSchema, body));
  }
}
