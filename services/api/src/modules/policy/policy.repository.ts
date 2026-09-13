import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';

@Injectable()
export class PolicyRepository {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  ensurePolicy(workspaceId: string) {
    return this.db.policy.upsert({ where: { workspaceId }, create: { workspaceId }, update: {} });
  }

  updatePolicy(
    workspaceId: string,
    data: {
      minAppVersion?: string;
      maxOfflineHours?: number;
      riskWeightNotPaired?: number;
      riskWeightOfflineTooLong?: number;
      riskWeightAgentOutdated?: number;
      riskWeightNeverSeen?: number;
      riskWeightRevoked?: number;
    },
  ) {
    return this.db.policy.update({ where: { workspaceId }, data });
  }

  getDevice(deviceId: string) {
    return this.db.device.findUnique({ where: { deviceId } });
  }

  listDevices(workspaceId: string) {
    return this.db.device.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
  }
}
