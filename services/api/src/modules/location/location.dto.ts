import { z } from 'zod';

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

// One consented position report. consentVersion is mandatory: without a recorded
// consent there is no collection and no LOCATION_EVENT (doc 16 §3, doc 27).
const locationSampleSchema = z.object({
  latitude,
  longitude,
  accuracyMeters: z.number().min(0).max(100_000),
  source: z.enum(['GPS', 'FUSED', 'NETWORK']),
  observedAt: z.iso.datetime(),
  consentVersion: z.string().min(1).max(40),
});

// Batched so the agent can queue offline and flush on reconnect.
export const reportLocationsSchema = z.object({
  samples: z.array(locationSampleSchema).min(1).max(200),
});

export const createGeofenceSchema = z.object({
  name: z.string().min(1).max(80),
  centerLatitude: latitude,
  centerLongitude: longitude,
  radiusMeters: z.number().int().min(50).max(50_000),
  transitions: z.array(z.enum(['ENTER', 'EXIT', 'DWELL'])).min(1).max(3),
  dwellMinutes: z.number().int().min(1).max(1440).optional(),
});

export const updateGeofenceSchema = createGeofenceSchema
  .extend({ active: z.boolean() })
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'at least one field is required' });

export type ReportLocationsInput = z.infer<typeof reportLocationsSchema>;
export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>;
export type UpdateGeofenceInput = z.infer<typeof updateGeofenceSchema>;
