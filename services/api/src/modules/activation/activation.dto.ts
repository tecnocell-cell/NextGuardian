import { z } from 'zod';

export const validateActivationSchema = z.object({
  code: z.string().trim().min(1).max(64),
  deviceId: z.uuid(),
});

export type ValidateActivationInput = z.infer<typeof validateActivationSchema>;

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
