// Maps persistence records to the OpenAPI contract shapes. accountId == workspaceId (ADR-0003).

export interface DeviceRecord {
  deviceId: string;
  workspaceId: string;
  name: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  appVersion: string;
  pairingState: 'UNPAIRED' | 'PAIRING_PENDING' | 'PAIRED' | 'REVOKED';
  lastSyncAt: Date | null;
}

export interface SubscriptionRecord {
  workspaceId: string;
  state: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  trialStartedAt: Date;
  trialExpiresAt: Date;
}

export function deviceView(device: DeviceRecord) {
  return { id: device.deviceId, accountId: device.workspaceId, name: device.name, pairingState: device.pairingState };
}

export interface DeviceSummaryRecord extends DeviceRecord {
  batteryLevel: number | null;
  networkType: string | null;
}

export function deviceSummaryView(device: DeviceSummaryRecord) {
  return {
    id: device.deviceId,
    name: device.name,
    pairingState: device.pairingState,
    manufacturer: device.manufacturer,
    model: device.model,
    androidVersion: device.androidVersion,
    appVersion: device.appVersion,
    lastSync: device.lastSyncAt ? device.lastSyncAt.toISOString() : null,
    batteryLevel: device.batteryLevel,
    networkType: device.networkType,
  };
}

export function deviceInfoView(device: DeviceRecord) {
  return {
    name: device.name,
    manufacturer: device.manufacturer,
    model: device.model,
    androidVersion: device.androidVersion,
    appVersion: device.appVersion,
  };
}

export function subscriptionView(subscription: SubscriptionRecord) {
  return {
    accountId: subscription.workspaceId,
    state: subscription.state,
    trialStartedAt: subscription.trialStartedAt.toISOString(),
    trialExpiresAt: subscription.trialExpiresAt.toISOString(),
  };
}

export interface EventRecord {
  eventId: string;
  deviceId: string | null;
  category: string;
  type: string;
  severity: string;
  source: string;
  payload: unknown;
  occurredAt: Date;
}

export function eventView(event: EventRecord) {
  return {
    id: event.eventId,
    deviceId: event.deviceId,
    category: event.category,
    type: event.type,
    severity: event.severity,
    source: event.source,
    payload: event.payload ?? null,
    occurredAt: event.occurredAt.toISOString(),
  };
}

export interface CommandRecord {
  commandId: string;
  deviceId: string;
  type: string;
  payload: unknown;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  deliveredAt: Date | null;
  executedAt: Date | null;
  result: string | null;
}

export function commandView(command: CommandRecord) {
  return {
    id: command.commandId,
    deviceId: command.deviceId,
    type: command.type,
    payload: command.payload ?? null,
    status: command.status,
    createdAt: command.createdAt.toISOString(),
    expiresAt: command.expiresAt.toISOString(),
    deliveredAt: command.deliveredAt ? command.deliveredAt.toISOString() : null,
    executedAt: command.executedAt ? command.executedAt.toISOString() : null,
    result: command.result,
  };
}

export interface LocationSampleRecord {
  locationSampleId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: string;
  observedAt: Date;
  serverReceivedAt: Date;
  consentVersion: string;
}

// observedAt is the device's own clock and is labelled as such; serverReceivedAt
// is the authority the console must trust for freshness (ADR-0004).
export function locationSampleView(sample: LocationSampleRecord) {
  return {
    id: sample.locationSampleId,
    latitude: sample.latitude,
    longitude: sample.longitude,
    accuracyMeters: sample.accuracyMeters,
    source: sample.source,
    observedAt: sample.observedAt.toISOString(),
    serverReceivedAt: sample.serverReceivedAt.toISOString(),
    consentVersion: sample.consentVersion,
  };
}

export interface GeofenceRecord {
  geofenceId: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  transitions: string[];
  dwellMinutes: number;
  active: boolean;
  updatedAt: Date;
}

export function geofenceView(geofence: GeofenceRecord) {
  return {
    id: geofence.geofenceId,
    name: geofence.name,
    centerLatitude: geofence.centerLatitude,
    centerLongitude: geofence.centerLongitude,
    radiusMeters: geofence.radiusMeters,
    transitions: geofence.transitions,
    dwellMinutes: geofence.dwellMinutes,
    active: geofence.active,
    updatedAt: geofence.updatedAt.toISOString(),
  };
}

export function deviceSessionView(
  session: { sessionId: string; deviceId: string; accessExpiresAt: Date },
  tokens: { accessToken: string; refreshToken: string },
) {
  return {
    sessionId: session.sessionId,
    deviceId: session.deviceId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: session.accessExpiresAt.toISOString(),
  };
}
