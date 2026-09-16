import { Inject, Injectable } from '@nestjs/common';
import { Database } from '../../shared/db/database.js';
import type { GeofenceTransition, LocationSource } from '../../generated/prisma/enums.js';

export interface SampleRow {
  workspaceId: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: LocationSource;
  observedAt: Date;
  consentVersion: string;
}

@Injectable()
export class LocationRepository {
  constructor(@Inject(Database) private readonly database: Database) {}
  private get db() { return this.database.client; }

  getDevice(deviceId: string) {
    return this.db.device.findUnique({ where: { deviceId } });
  }

  createSamples(rows: SampleRow[]) {
    return this.db.locationSample.createMany({ data: rows });
  }

  latestSample(workspaceId: string, deviceId: string) {
    return this.db.locationSample.findFirst({
      where: { workspaceId, deviceId }, orderBy: { serverReceivedAt: 'desc' },
    });
  }

  listSamples(workspaceId: string, deviceId: string, limit: number) {
    return this.db.locationSample.findMany({
      where: { workspaceId, deviceId }, orderBy: { serverReceivedAt: 'desc' }, take: limit,
    });
  }

  // Sensitive data: enforce the tenant's retention window on every ingest (LGPD, doc 16).
  prune(workspaceId: string, deviceId: string, before: Date) {
    return this.db.locationSample.deleteMany({
      where: { workspaceId, deviceId, serverReceivedAt: { lt: before } },
    });
  }

  deleteAllForDevice(workspaceId: string, deviceId: string) {
    return this.db.locationSample.deleteMany({ where: { workspaceId, deviceId } });
  }

  activeGeofences(workspaceId: string) {
    return this.db.geofence.findMany({ where: { workspaceId, active: true } });
  }

  listGeofences(workspaceId: string) {
    return this.db.geofence.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
  }

  getGeofence(geofenceId: string) {
    return this.db.geofence.findUnique({ where: { geofenceId } });
  }

  createGeofence(data: {
    workspaceId: string;
    name: string;
    centerLatitude: number;
    centerLongitude: number;
    radiusMeters: number;
    transitions: GeofenceTransition[];
    dwellMinutes?: number;
  }) {
    return this.db.geofence.create({ data });
  }

  updateGeofence(
    geofenceId: string,
    data: {
      name?: string;
      centerLatitude?: number;
      centerLongitude?: number;
      radiusMeters?: number;
      transitions?: GeofenceTransition[];
      dwellMinutes?: number;
      active?: boolean;
    },
  ) {
    return this.db.geofence.update({ where: { geofenceId }, data });
  }

  deleteGeofence(geofenceId: string) {
    return this.db.geofence.delete({ where: { geofenceId } });
  }

  geofenceStates(workspaceId: string, deviceId: string) {
    return this.db.geofenceState.findMany({ where: { workspaceId, deviceId } });
  }

  upsertGeofenceState(data: {
    geofenceId: string;
    deviceId: string;
    workspaceId: string;
    inside: boolean;
    since: Date;
    dwellNotifiedAt: Date | null;
  }) {
    const { geofenceId, deviceId, ...rest } = data;
    return this.db.geofenceState.upsert({
      where: { geofenceId_deviceId: { geofenceId, deviceId } },
      create: { geofenceId, deviceId, ...rest },
      update: { inside: rest.inside, since: rest.since, dwellNotifiedAt: rest.dwellNotifiedAt },
    });
  }

  policy(workspaceId: string) {
    return this.db.policy.upsert({ where: { workspaceId }, create: { workspaceId }, update: {} });
  }
}
