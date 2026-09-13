import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { MembershipRole } from '../../generated/prisma/enums.js';
import { WorkspaceDatabase } from './workspace.database.js';

@Injectable()
export class WorkspaceRepository {
  constructor(@Inject(WorkspaceDatabase) private readonly database: WorkspaceDatabase) {}

  // The caller must supply trusted context; this is NOT authentication.
  // There is no HTTP controller until authorization is implemented in WP-103.
  forWorkspace(workspaceId: string): ScopedWorkspaceRepository {
    return new ScopedWorkspaceRepository(this.database.client, z.uuid().parse(workspaceId));
  }
}

export class ScopedWorkspaceRepository {
  constructor(private readonly db: PrismaClient, private readonly workspaceId: string) {
    z.uuid().parse(workspaceId);
  }

  getWorkspace() {
    return this.db.workspace.findUnique({ where: { workspaceId: this.workspaceId } });
  }

  async renameWorkspace(name: string) {
    const result = await this.db.workspace.updateMany({
      where: { workspaceId: this.workspaceId }, data: { name: z.string().trim().min(1).max(200).parse(name) },
    });
    return result.count;
  }

  listMemberships() {
    return this.db.membership.findMany({ where: { workspaceId: this.workspaceId }, orderBy: { userId: 'asc' } });
  }

  findMembership(userId: string) {
    return this.db.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: this.workspaceId, userId: z.uuid().parse(userId) } },
    });
  }

  async changeMemberRole(userId: string, role: MembershipRole) {
    const result = await this.db.membership.updateMany({
      where: { workspaceId: this.workspaceId, userId: z.uuid().parse(userId), status: 'ACTIVE' },
      data: { role: z.enum(['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER']).parse(role) },
    });
    return result.count;
  }

  async revokeMembership(userId: string) {
    const result = await this.db.membership.updateMany({
      where: { workspaceId: this.workspaceId, userId: z.uuid().parse(userId), status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });
    return result.count;
  }
}
