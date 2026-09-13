import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';

@Injectable()
export class SubscriptionRepository {
  constructor(@Inject(Database) private readonly database: Database) {}

  getForWorkspace(workspaceId: string) {
    return this.database.client.subscription.findUnique({ where: { workspaceId } });
  }
}
