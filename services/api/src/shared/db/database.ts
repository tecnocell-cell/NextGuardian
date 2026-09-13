import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

// Shared PostgreSQL connection for all feature modules. Fails closed without DATABASE_URL.
export class Database implements OnModuleDestroy {
  private instance?: PrismaClient;
  constructor(private readonly url?: string) {}

  get client(): PrismaClient {
    if (!this.url) throw new Error('DATABASE_URL is required for persistence');
    this.instance ??= new PrismaClient({
      adapter: new PrismaPg({ connectionString: this.url, connectionTimeoutMillis: 5000, max: 10 }),
      log: [],
      errorFormat: 'minimal',
    });
    return this.instance;
  }

  async onModuleDestroy() { await this.instance?.$disconnect(); }
}
