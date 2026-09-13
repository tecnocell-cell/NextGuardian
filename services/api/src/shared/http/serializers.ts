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
