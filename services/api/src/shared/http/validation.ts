import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

// Validates a request body; error messages carry field paths only, never values.
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = result.error.issues.map(issue => issue.path.join('.') || 'body').join(', ');
    throw new BadRequestException(`Invalid request: ${fields}`);
  }
  return result.data;
}

export function serverTime(): string {
  return new Date().toISOString();
}
