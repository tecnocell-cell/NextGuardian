import { z } from 'zod';

export const deviceInfoSchema = z.object({
  name: z.string().trim().min(1).max(120),
  manufacturer: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  androidVersion: z.string().trim().min(1).max(40),
  appVersion: z.string().trim().min(1).max(40),
});

export const pairSchema = z.object({
  deviceId: z.uuid(),
  deviceInfo: deviceInfoSchema,
});

export const confirmPairSchema = z.object({
  pairingId: z.uuid(),
  deviceId: z.uuid(),
  confirmedOnDevice: z.boolean(),
});

export const refreshSchema = z.object({
  deviceId: z.uuid(),
  refreshToken: z.string().min(32).max(400),
});

export const heartbeatSchema = z.object({
  deviceId: z.uuid(),
  appVersion: z.string().max(40),
  androidVersion: z.string().max(40),
  manufacturer: z.string().max(80),
  model: z.string().max(120),
  batteryLevel: z.number().int().min(0).max(100).nullable(),
  networkType: z.enum(['WIFI', 'CELLULAR', 'ETHERNET', 'NONE', 'UNKNOWN']),
  timestamp: z.string().min(1).max(40),
});

export const revokeSchema = z.object({
  deviceId: z.uuid(),
});

export type PairInput = z.infer<typeof pairSchema>;
export type ConfirmPairInput = z.infer<typeof confirmPairSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type RevokeInput = z.infer<typeof revokeSchema>;
