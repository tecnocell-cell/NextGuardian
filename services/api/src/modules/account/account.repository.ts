import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';

@Injectable()
export class AccountRepository {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  getWorkspace(workspaceId: string) {
    return this.db.workspace.findUnique({ where: { workspaceId } });
  }

  getUser(userId: string) {
    return this.db.user.findUnique({ where: { userId } });
  }

  countDevices(workspaceId: string) {
    return this.db.device.count({ where: { workspaceId } });
  }

  createActivationCode(input: { workspaceId: string; codeHash: string; expiresAt: Date }) {
    return this.db.activationCode.create({ data: input });
  }
}
