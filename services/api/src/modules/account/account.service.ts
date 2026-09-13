import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountRepository } from './account.repository.js';
import { generateActivationCode, hashToken } from '../../shared/crypto/secrets.js';
import { ACTIVATION_CODE_TTL } from '../../shared/time/durations.js';
import { serverTime } from '../../shared/http/validation.js';

@Injectable()
export class AccountService {
  constructor(private readonly repo: AccountRepository) {}

  async me(workspaceId: string, userId: string | undefined) {
    const [workspace, user, deviceCount] = await Promise.all([
      this.repo.getWorkspace(workspaceId),
      userId ? this.repo.getUser(userId) : Promise.resolve(null),
      this.repo.countDevices(workspaceId),
    ]);
    if (!workspace || !user) throw new UnauthorizedException('Account not found');
    return {
      account: { id: workspace.workspaceId, name: workspace.name, profile: workspace.profile },
      user: { id: user.userId, accountId: workspace.workspaceId, name: user.name, email: user.email },
      deviceCount,
      serverTime: serverTime(),
    };
  }

  async issueActivationCode(workspaceId: string) {
    const code = generateActivationCode();
    const expiresAt = new Date(Date.now() + ACTIVATION_CODE_TTL);
    await this.repo.createActivationCode({ workspaceId, codeHash: hashToken(code), expiresAt });
    return { value: code, expiresAt: expiresAt.toISOString(), serverTime: serverTime() };
  }
}
