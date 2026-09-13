import { z } from 'zod';

export const COMMAND_TYPES = ['REQUEST_CHECKIN', 'SYNC_NOW', 'SHOW_MESSAGE', 'RING_DEVICE', 'REFRESH_DEVICE_INFO'] as const;

export const enqueueCommandSchema = z.object({
  type: z.enum(COMMAND_TYPES),
  payload: z.object({ text: z.string().trim().min(1).max(500) }).optional(),
});

export const ackCommandSchema = z.object({
  status: z.enum(['EXECUTED', 'FAILED']),
  result: z.string().max(500).optional(),
});

export type EnqueueCommandInput = z.infer<typeof enqueueCommandSchema>;
export type AckCommandInput = z.infer<typeof ackCommandSchema>;
