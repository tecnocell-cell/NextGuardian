import { Module } from '@nestjs/common';
import { AgentLocationController, LocationController } from './location.controller.js';
import { LocationService } from './location.service.js';
import { LocationRepository } from './location.repository.js';
import { EventsModule } from '../events/events.module.js';
import { AccountGuard, DeviceGuard } from '../../shared/auth/guards.js';
import { RolesGuard } from '../../shared/auth/roles.js';

@Module({
  imports: [EventsModule],
  controllers: [LocationController, AgentLocationController],
  providers: [LocationService, LocationRepository, AccountGuard, DeviceGuard, RolesGuard],
})
export class LocationModule {}
