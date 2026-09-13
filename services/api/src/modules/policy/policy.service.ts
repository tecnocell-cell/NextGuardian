import { Injectable } from '@nestjs/common';
import { PolicyRepository } from './policy.repository.js';
import type { UpdatePolicyInput } from './policy.dto.js';
import { serverTime } from '../../shared/http/validation.js';

interface PolicyRecord { minAppVersion: string; maxOfflineHours: number; active: boolean; updatedAt: Date }

function policyView(policy: PolicyRecord) {
  return {
    minAppVersion: policy.minAppVersion,
    maxOfflineHours: policy.maxOfflineHours,
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
    const policy = await this.repo.updatePolicy(workspaceId, input);
    return { policy: policyView(policy), serverTime: serverTime() };
  }
}
