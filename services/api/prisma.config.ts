import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { parseEnvironment } from './src/shared/config/environment.ts';

const config = parseEnvironment(process.env);
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: config.DATABASE_URL },
});
