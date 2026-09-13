import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.enum(['127.0.0.1', '0.0.0.0', '::1', '::']).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url().refine(value => /^postgres(?:ql)?:\/\//.test(value)).optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().min(1).optional(),
});
export type Environment = z.infer<typeof schema>;
export function parseEnvironment(input: Record<string, unknown>): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Only variable names: never echo environment values or validation input.
    throw new Error(`Invalid environment: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`);
  }
  return result.data;
}
