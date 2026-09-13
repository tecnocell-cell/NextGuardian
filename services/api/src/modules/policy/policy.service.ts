import { Injectable } from '@nestjs/common';
import { PolicyRepository } from './policy.repository.js';
import type { UpdatePolicyInput } from './policy.dto.js';
import { serverTime } from '../../shared/http/validation.js';

interface PolicyRecord {
  minAppVersion: string;
  maxOfflineHours: number;
  riskWeightNotPaired: number;
  riskWeightOfflineTooLong: number;
  riskWeightAgentOutdated: number;
  riskWeightNeverSeen: number;
  riskWeightRevoked: number;
  active: boolean;
  updatedAt: Date;
}

function policyView(policy: PolicyRecord) {
  return {
    minAppVersion: policy.minAppVersion,
    maxOfflineHours: policy.maxOfflineHours,
    weights: {
      notPaired: policy.riskWeightNotPaired,
      offlineTooLong: policy.riskWeightOfflineTooLong,
      agentOutdated: policy.riskWeightAgentOutdated,
      neverSeen: policy.riskWeightNeverSeen,
      revoked: policy.riskWeightRevoked,
    },
    active: policy.active,
    updatedAt: policy.updatedAt.toISOString(),
  };
}

@Injectable()
export class PolicyService {
  constructor(private readonly repo: PolicyRepository) {}

  async get(workspaceId: string) {
    const policy = await this.repo.ensurePolicy(workspaceId);
    return { policy: policyView(policy), serverTime: serverTime() };
  }

  async update(workspaceId: string, input: UpdatePolicyInput) {
    await this.repo.ensurePolicy(workspaceId);
    const data: Parameters<PolicyRepository['updatePolicy']>[1] = {};
    if (input.minAppVersion !== undefined) data.minAppVersion = input.minAppVersion;
    if (input.maxOfflineHours !== undefined) data.maxOfflineHours = input.maxOfflineHours;
    const w = input.weights;
    if (w) {
      if (w.notPaired !== undefined) data.riskWeightNotPaired = w.notPaired;
      if (w.offlineTooLong !== undefined) data.riskWeightOfflineTooLong = w.offlineTooLong;
      if (w.agentOutdated !== undefined) data.riskWeightAgentOutdated = w.agentOutdated;
      if (w.neverSeen !== undefined) data.riskWeightNeverSeen = w.neverSeen;
      if (w.revoked !== undefined) data.riskWeightRevoked = w.revoked;
    }
    const policy = await this.repo.updatePolicy(workspaceId, data);
    return { policy: policyView(policy), serverTime: serverTime() };
  }
}
