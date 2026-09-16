import { Module } from '@nestjs/common';
import { AgentCommandsController, CommandsController } from './commands.controller.js';
import { CommandsService } from './commands.service.js';
import { CommandsRepository } from './commands.repository.js';
import { EventsModule } from '../events/events.module.js';
import { AccountGuard, DeviceGuard } from '../../shared/auth/guards.js';
import { RolesGuard } from '../../shared/auth/roles.js';

@Module({
  imports: [EventsModule],
  controllers: [CommandsController, AgentCommandsController],
  providers: [CommandsService, CommandsRepository, AccountGuard, DeviceGuard, RolesGuard],
})
export class CommandsModule {}
