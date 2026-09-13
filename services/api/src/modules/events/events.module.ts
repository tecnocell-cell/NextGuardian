import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { AccountGuard } from '../../shared/auth/guards.js';

@Module({
  controllers: [EventsController],
  providers: [EventsService, AccountGuard],
  exports: [EventsService],
})
export class EventsModule {}
