import { z } from 'zod';

export const updatePolicySchema = z
  .object({
    minAppVersion: z.string().regex(/^\d+(\.\d+)*(-.*)?$/, 'invalid version').max(40).optional(),
    maxOfflineHours: z.number().int().min(1).max(8760).optional(),
  })
  .refine(data => data.minAppVersion !== undefined || data.maxOfflineHours !== undefined, {
    message: 'at least one field is required',
  });

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
