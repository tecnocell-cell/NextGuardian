import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { parseEnvironment } from './src/shared/config/environment.ts';

const config = parseEnvironment(process.env);

// Only `prisma migrate diff --from-migrations` needs a shadow database, and it must
// be a throwaway: it is reset and replayed. Never point it at a real database.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: config.DATABASE_URL, ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}) },
});
