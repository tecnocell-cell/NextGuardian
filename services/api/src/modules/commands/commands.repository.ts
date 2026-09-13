import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { CommandType } from '../../generated/prisma/enums.js';

@Injectable()
export class CommandsRepository {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  getDevice(deviceId: string) {
    return this.db.device.findUnique({ where: { deviceId } });
  }

  create(input: {
    workspaceId: string;
    deviceId: string;
    type: CommandType;
    payload?: Record<string, unknown>;
    requestedBy?: string;
    expiresAt: Date;
  }) {
    return this.db.command.create({
      data: {
        workspaceId: input.workspaceId,
        deviceId: input.deviceId,
        type: input.type,
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        requestedBy: input.requestedBy,
        expiresAt: input.expiresAt,
      },
    });
  }

  listForDevice(workspaceId: string, deviceId: string) {
    return this.db.command.findMany({ where: { workspaceId, deviceId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  // Device poll: expire overdue, deliver pending, return the delivered set.
  async fetchPending(workspaceId: string, deviceId: string) {
    return this.db.$transaction(async tx => {
      await tx.command.updateMany({
        where: { workspaceId, deviceId, status: 'QUEUED', expiresAt: { lte: new Date() } },
        data: { status: 'EXPIRED' },
      });
      const pending = await tx.command.findMany({ where: { workspaceId, deviceId, status: 'QUEUED' }, orderBy: { createdAt: 'asc' } });
      if (pending.length > 0) {
        await tx.command.updateMany({
          where: { commandId: { in: pending.map(c => c.commandId) } },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        });
      }
      return tx.command.findMany({ where: { commandId: { in: pending.map(c => c.commandId) } }, orderBy: { createdAt: 'asc' } });
    });
  }

  async ack(workspaceId: string, deviceId: string, commandId: string, status: 'EXECUTED' | 'FAILED', result?: string) {
    const updated = await this.db.command.updateMany({
      where: { commandId, workspaceId, deviceId, status: 'DELIVERED' },
      data: { status, executedAt: new Date(), result: result ?? null },
    });
    if (updated.count === 0) return null;
    return this.db.command.findUnique({ where: { commandId } });
  }
}
