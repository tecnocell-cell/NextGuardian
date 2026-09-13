import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandsRepository } from './commands.repository.js';
import type { AckCommandInput, EnqueueCommandInput } from './commands.dto.js';
import { EventsService } from '../events/events.service.js';
import { commandView } from '../../shared/http/serializers.js';
import { serverTime } from '../../shared/http/validation.js';
import { DAY } from '../../shared/time/durations.js';
import type { Principal } from '../../shared/auth/principal.js';

@Injectable()
export class CommandsService {
  constructor(private readonly repo: CommandsRepository, private readonly events: EventsService) {}

  async enqueue(principal: Principal, deviceId: string, input: EnqueueCommandInput) {
    const device = await this.repo.getDevice(deviceId);
    if (!device || device.workspaceId !== principal.workspaceId) throw new NotFoundException('Device not found in workspace');
    if (device.pairingState !== 'PAIRED') throw new ConflictException('Device is not paired');
    if (input.type === 'SHOW_MESSAGE' && !input.payload?.text) throw new BadRequestException('SHOW_MESSAGE requires payload.text');

    const command = await this.repo.create({
      workspaceId: principal.workspaceId,
      deviceId,
      type: input.type,
      payload: input.payload,
      requestedBy: principal.userId,
      expiresAt: new Date(Date.now() + DAY),
    });
    await this.events.record({
      workspaceId: principal.workspaceId, deviceId, category: 'COMMAND', type: 'COMMAND_CREATED',
      source: 'ADMIN', payload: { commandId: command.commandId, type: command.type },
    });
    return commandView(command);
  }

  async listForDevice(principal: Principal, deviceId: string) {
    const commands = await this.repo.listForDevice(principal.workspaceId, deviceId);
    return { commands: commands.map(commandView), serverTime: serverTime() };
  }

  async fetchForAgent(principal: Principal) {
    if (!principal.deviceId) throw new NotFoundException('Device session required');
    const commands = await this.repo.fetchPending(principal.workspaceId, principal.deviceId);
    return { commands: commands.map(commandView), serverTime: serverTime() };
  }

  async ack(principal: Principal, commandId: string, input: AckCommandInput) {
    if (!principal.deviceId) throw new NotFoundException('Device session required');
    const command = await this.repo.ack(principal.workspaceId, principal.deviceId, commandId, input.status, input.result);
    if (!command) throw new ConflictException('Command not deliverable for acknowledgement');
    await this.events.record({
      workspaceId: principal.workspaceId, deviceId: principal.deviceId, category: 'COMMAND',
      type: input.status === 'EXECUTED' ? 'COMMAND_EXECUTED' : 'COMMAND_FAILED',
      severity: input.status === 'EXECUTED' ? 'INFO' : 'WARNING',
      source: 'AGENT', payload: { commandId, type: command.type },
    });
    return commandView(command);
  }
}
