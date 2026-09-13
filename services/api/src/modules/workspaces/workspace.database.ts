import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

// Internal provider. Only WorkspaceRepository is exported by the module.
export class WorkspaceDatabase implements OnModuleDestroy {
  private instance?: PrismaClient;
  constructor(private readonly url?: string) {}

  get client(): PrismaClient {
    if (!this.url) throw new Error('DATABASE_URL is required for workspace persistence');
    this.instance ??= new PrismaClient({
      adapter: new PrismaPg({ connectionString: this.url, connectionTimeoutMillis: 5000, max: 5 }),
      log: [],
      errorFormat: 'minimal',
    });
    return this.instance;
  }

  async onModuleDestroy() { await this.instance?.$disconnect(); }
}
