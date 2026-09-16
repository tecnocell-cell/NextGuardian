import { z } from 'zod';

const weight = z.number().int().min(0).max(100);

export const updatePolicySchema = z
  .object({
    minAppVersion: z.string().regex(/^\d+(\.\d+)*(-.*)?$/, 'invalid version').max(40).optional(),
    maxOfflineHours: z.number().int().min(1).max(8760).optional(),
    weights: z
      .object({
        notPaired: weight,
        offlineTooLong: weight,
        agentOutdated: weight,
        neverSeen: weight,
        revoked: weight,
      })
      .partial()
      .optional(),
    // Location is sensitive: retention is capped at a year and defaults short (LGPD).
    locationRetentionDays: z.number().int().min(1).max(365).optional(),
    locationStaleMinutes: z.number().int().min(1).max(1440).optional(),
  })
  .refine(data => Object.values(data).some(value => value !== undefined), {
    message: 'at least one field is required',
  });

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
