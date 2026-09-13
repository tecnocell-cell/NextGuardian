import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';

export interface SessionInput {
  workspaceId: string;
  userId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  primaryMembership(userId: string) {
    return this.db.membership.findFirst({ where: { userId, status: 'ACTIVE' }, orderBy: { workspaceId: 'asc' } });
  }

  getWorkspace(workspaceId: string) {
    return this.db.workspace.findUnique({ where: { workspaceId } });
  }

  // Atomic: workspace + owner user + membership are created together or not at all.
  createAccount(params: { workspaceName: string; userName: string; email: string; passwordHash: string }) {
    return this.db.$transaction(async tx => {
      const workspace = await tx.workspace.create({ data: { name: params.workspaceName, profile: 'FAMILY' } });
      const user = await tx.user.create({
        data: { name: params.userName, email: params.email, passwordHash: params.passwordHash },
      });
      await tx.membership.create({ data: { workspaceId: workspace.workspaceId, userId: user.userId, role: 'OWNER' } });
      return { workspace, user };
    });
  }

  createSession(input: SessionInput) {
    return this.db.session.create({ data: input });
  }

  createActivationCode(input: { workspaceId: string; codeHash: string; expiresAt: Date }) {
    return this.db.activationCode.create({ data: input });
  }
}
