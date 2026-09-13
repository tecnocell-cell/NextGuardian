import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { DevicesRepository } from './devices.repository.js';
import { AccountGuard, AccountOrDeviceGuard, DeviceGuard } from '../../shared/auth/guards.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository, DeviceGuard, AccountGuard, AccountOrDeviceGuard],
})
export class DevicesModule {}
