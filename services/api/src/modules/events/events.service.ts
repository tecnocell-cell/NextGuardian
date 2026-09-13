import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import { eventView } from '../../shared/http/serializers.js';
import { serverTime } from '../../shared/http/validation.js';
import type { EventCategory, EventSeverity } from '../../generated/prisma/enums.js';

export interface RecordEventInput {
  workspaceId: string;
  deviceId?: string | null;
  category: EventCategory;
  type: string;
  severity?: EventSeverity;
  source?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class EventsService {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  // Best-effort append-only record. Never throws into the caller's main flow.
  async record(input: RecordEventInput): Promise<void> {
    try {
      await this.db.event.create({
        data: {
          workspaceId: input.workspaceId,
          deviceId: input.deviceId ?? null,
          category: input.category,
          type: input.type,
          severity: input.severity ?? 'INFO',
          source: input.source ?? 'SERVER',
          payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch { /* timeline is non-critical; do not fail the operation */ }
  }

  async deviceTimeline(workspaceId: string, deviceId: string) {
    const events = await this.db.event.findMany({
      where: { workspaceId, deviceId }, orderBy: { occurredAt: 'desc' }, take: 100,
    });
    return { events: events.map(eventView), serverTime: serverTime() };
  }

  async workspaceRecent(workspaceId: string) {
    const events = await this.db.event.findMany({
      where: { workspaceId }, orderBy: { occurredAt: 'desc' }, take: 50,
    });
    return { events: events.map(eventView), serverTime: serverTime() };
  }
}
