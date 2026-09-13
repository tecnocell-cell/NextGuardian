import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
