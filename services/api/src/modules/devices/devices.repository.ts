import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';
import { HOUR } from '../../shared/time/durations.js';

// Default FAMILY plan, created lazily when the first trial is needed (ADR-0011: limits are data).
const DEFAULT_FAMILY_PLAN = { name: 'Family Trial', deviceLimit: 5, trialDurationHours: 48 };

export interface DeviceInfoData {
  name: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  appVersion: string;
}

export interface SessionHashes {
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

@Injectable()
export class DevicesRepository {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  findActivationByTicketHash(ticketHash: string) {
    return this.db.activationCode.findUnique({ where: { ticketHash } });
  }

  findPairingByTicketHash(ticketHash: string) {
    return this.db.pairing.findUnique({ where: { ticketHash } });
  }

  getDevice(deviceId: string) {
    return this.db.device.findUnique({ where: { deviceId } });
  }

  getSubscription(workspaceId: string) {
    return this.db.subscription.findUnique({ where: { workspaceId } });
  }

  async pair(params: {
    workspaceId: string;
    deviceId: string;
    info: DeviceInfoData;
    pairingTicketHash: string;
    pairingExpiresAt: Date;
  }) {
    return this.db.$transaction(async tx => {
      const existing = await tx.device.findUnique({ where: { deviceId: params.deviceId } });
      if (existing && existing.workspaceId !== params.workspaceId) {
        throw new ConflictException('Device belongs to another workspace');
      }
      const device = existing
        ? await tx.device.update({
            where: { deviceId: params.deviceId },
            data: { ...params.info, pairingState: 'PAIRING_PENDING' },
          })
        : await tx.device.create({
            data: { deviceId: params.deviceId, workspaceId: params.workspaceId, ...params.info, pairingState: 'PAIRING_PENDING' },
          });
      const pairing = await tx.pairing.create({
        data: {
          workspaceId: params.workspaceId,
          deviceId: params.deviceId,
          ticketHash: params.pairingTicketHash,
          expiresAt: params.pairingExpiresAt,
        },
      });
      return { device, pairing };
    });
  }

  // Atomic confirmation: PAIRED + trial (once per workspace) + consumed code + device session.
  async confirm(params: { workspaceId: string; deviceId: string; pairingId: string; session: SessionHashes }) {
    return this.db.$transaction(async tx => {
      const plan =
        (await tx.plan.findFirst({ where: { profile: 'FAMILY', active: true }, orderBy: { planId: 'asc' } })) ??
        (await tx.plan.create({ data: { profile: 'FAMILY', ...DEFAULT_FAMILY_PLAN } }));

      const pairedCount = await tx.device.count({
        where: { workspaceId: params.workspaceId, pairingState: 'PAIRED', NOT: { deviceId: params.deviceId } },
      });
      if (pairedCount >= plan.deviceLimit) throw new ConflictException('Device limit reached for plan');

      const device = await tx.device.update({ where: { deviceId: params.deviceId }, data: { pairingState: 'PAIRED' } });
      await tx.pairing.update({ where: { pairingId: params.pairingId }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
      await tx.activationCode.updateMany({
        where: { workspaceId: params.workspaceId, boundDeviceId: params.deviceId, status: 'ISSUED' },
        data: { status: 'CONSUMED', consumedAt: new Date() },
      });

      let subscription = await tx.subscription.findUnique({ where: { workspaceId: params.workspaceId } });
      if (!subscription) {
        const now = new Date();
        subscription = await tx.subscription.create({
          data: {
            workspaceId: params.workspaceId,
            planId: plan.planId,
            state: 'TRIAL',
            trialStartedAt: now,
            trialExpiresAt: new Date(now.getTime() + plan.trialDurationHours * HOUR),
          },
        });
      }

      const session = await tx.deviceSession.create({
        data: { workspaceId: params.workspaceId, deviceId: params.deviceId, ...params.session },
      });
      return { device, subscription, session };
    });
  }

  async rotateSession(params: { deviceId: string; refreshTokenHash: string; next: SessionHashes }) {
    return this.db.$transaction(async tx => {
      const current = await tx.deviceSession.findUnique({ where: { refreshTokenHash: params.refreshTokenHash } });
      if (!current || current.deviceId !== params.deviceId) return { outcome: 'invalid' as const };
      if (current.status !== 'ACTIVE' || current.refreshExpiresAt <= new Date()) {
        // Replay or expiry: invalidate the whole family for the device.
        await tx.deviceSession.updateMany({ where: { deviceId: params.deviceId, status: 'ACTIVE' }, data: { status: 'REVOKED' } });
        return { outcome: 'invalid' as const };
      }
      await tx.deviceSession.update({ where: { sessionId: current.sessionId }, data: { status: 'REVOKED' } });
      const session = await tx.deviceSession.create({
        data: { workspaceId: current.workspaceId, deviceId: params.deviceId, ...params.next },
      });
      return { outcome: 'rotated' as const, session };
    });
  }

  recordHeartbeat(deviceId: string, data: { batteryLevel: number | null; networkType: string; at: Date }) {
    return this.db.device.update({
      where: { deviceId },
      data: { lastSyncAt: data.at, batteryLevel: data.batteryLevel, networkType: data.networkType },
    });
  }

  async revoke(workspaceId: string, deviceId: string) {
    return this.db.$transaction(async tx => {
      const updated = await tx.device.updateMany({ where: { deviceId, workspaceId }, data: { pairingState: 'REVOKED' } });
      if (updated.count === 0) return null;
      await tx.deviceSession.updateMany({ where: { deviceId, workspaceId, status: 'ACTIVE' }, data: { status: 'REVOKED' } });
      return tx.device.findUnique({ where: { deviceId } });
    });
  }
}
