import { Injectable, NotFoundException } from '@nestjs/common';
import { PolicyRepository } from './policy.repository.js';
import { evaluateRisk } from './risk.js';
import { serverTime } from '../../shared/http/validation.js';

@Injectable()
export class RiskService {
  constructor(private readonly repo: PolicyRepository) {}

  async deviceRisk(workspaceId: string, deviceId: string) {
    const device = await this.repo.getDevice(deviceId);
    if (!device || device.workspaceId !== workspaceId) throw new NotFoundException('Device not found in workspace');
    const policy = await this.repo.ensurePolicy(workspaceId);
    const result = evaluateRisk(
      { pairingState: device.pairingState, appVersion: device.appVersion, lastSyncAt: device.lastSyncAt },
      { minAppVersion: policy.minAppVersion, maxOfflineHours: policy.maxOfflineHours },
      new Date(),
    );
    return { deviceId, ...result, serverTime: serverTime() };
  }

  async workspaceRisk(workspaceId: string) {
    const policy = await this.repo.ensurePolicy(workspaceId);
    const thresholds = { minAppVersion: policy.minAppVersion, maxOfflineHours: policy.maxOfflineHours };
    const now = new Date();
    const devices = await this.repo.listDevices(workspaceId);
    const items = devices.map(device => {
      const result = evaluateRisk(
        { pairingState: device.pairingState, appVersion: device.appVersion, lastSyncAt: device.lastSyncAt },
        thresholds,
        now,
      );
      return { deviceId: device.deviceId, name: device.name, score: result.score, level: result.level, compliance: result.compliance };
    });
    const nonCompliant = items.filter(i => i.compliance === 'NON_COMPLIANT').length;
    return { devices: items, nonCompliant, serverTime: serverTime() };
  }
}
