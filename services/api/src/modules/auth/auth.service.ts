import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository.js';
import { normalizeEmail, type LoginInput, type RegisterInput } from './auth.dto.js';
import { hashPassword, verifyPassword, generateActivationCode, hashToken } from '../../shared/crypto/secrets.js';
import { issueTokens } from '../../shared/auth/tokens.js';
import { ACCOUNT_ACCESS_TTL, ACCOUNT_REFRESH_TTL, ACTIVATION_CODE_TTL } from '../../shared/time/durations.js';
import { serverTime } from '../../shared/http/validation.js';

interface WorkspaceRecord { workspaceId: string; name: string }
interface UserRecord { userId: string; name: string; email: string }

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async register(input: RegisterInput) {
    const email = normalizeEmail(input.email);
    if (await this.repo.findUserByEmail(email)) {
      throw new ConflictException('Email already registered');
    }
    const { workspace, user } = await this.repo.createAccount({
      workspaceName: input.name,
      userName: input.name,
      email,
      passwordHash: hashPassword(input.password),
    });
    return this.buildAuthResponse(workspace, user);
  }

  async login(input: LoginInput) {
    const email = normalizeEmail(input.email);
    const user = await this.repo.findUserByEmail(email);
    if (!user || !user.passwordHash || user.status !== 'ACTIVE' || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const membership = await this.repo.primaryMembership(user.userId);
    const workspace = membership ? await this.repo.getWorkspace(membership.workspaceId) : null;
    if (!workspace) throw new UnauthorizedException('No active workspace');
    return this.buildAuthResponse(workspace, user);
  }

  private async buildAuthResponse(workspace: WorkspaceRecord, user: UserRecord) {
    const tokens = issueTokens(ACCOUNT_ACCESS_TTL, ACCOUNT_REFRESH_TTL);
    await this.repo.createSession({
      workspaceId: workspace.workspaceId,
      userId: user.userId,
      accessTokenHash: tokens.accessTokenHash,
      refreshTokenHash: tokens.refreshTokenHash,
      accessExpiresAt: tokens.accessExpiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
    });
    const code = generateActivationCode();
    const codeExpiresAt = new Date(Date.now() + ACTIVATION_CODE_TTL);
    await this.repo.createActivationCode({ workspaceId: workspace.workspaceId, codeHash: hashToken(code), expiresAt: codeExpiresAt });
    return {
      account: { id: workspace.workspaceId, name: workspace.name },
      user: { id: user.userId, accountId: workspace.workspaceId, name: user.name, email: user.email },
      session: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresAt: tokens.accessExpiresAt.toISOString(),
      },
      activationCode: { value: code, expiresAt: codeExpiresAt.toISOString() },
      serverTime: serverTime(),
    };
  }
}
