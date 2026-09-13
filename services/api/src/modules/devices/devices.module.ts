import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { DevicesRepository } from './devices.repository.js';
import { AccountOrDeviceGuard, DeviceGuard } from '../../shared/auth/guards.js';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository, DeviceGuard, AccountOrDeviceGuard],
})
export class DevicesModule {}
