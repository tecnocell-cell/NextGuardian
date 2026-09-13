import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';

@Injectable()
export class ActivationRepository {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  findByCodeHash(codeHash: string) {
    return this.db.activationCode.findUnique({ where: { codeHash } });
  }

  getWorkspace(workspaceId: string) {
    return this.db.workspace.findUnique({ where: { workspaceId } });
  }

  markExpired(activationCodeId: string) {
    return this.db.activationCode.update({ where: { activationCodeId }, data: { status: 'EXPIRED' } });
  }

  incrementAttempts(activationCodeId: string) {
    return this.db.activationCode.update({ where: { activationCodeId }, data: { attempts: { increment: 1 } } });
  }

  bindTicket(activationCodeId: string, data: { boundDeviceId: string; ticketHash: string; ticketExpiresAt: Date }) {
    return this.db.activationCode.update({ where: { activationCodeId }, data });
  }
}
