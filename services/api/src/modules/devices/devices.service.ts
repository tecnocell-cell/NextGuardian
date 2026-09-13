import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DevicesRepository } from './devices.repository.js';
import type { ConfirmPairInput, HeartbeatInput, PairInput, RefreshInput, RevokeInput } from './devices.dto.js';
import { generateToken, hashToken } from '../../shared/crypto/secrets.js';
import { issueTokens } from '../../shared/auth/tokens.js';
import { DEVICE_ACCESS_TTL, DEVICE_REFRESH_TTL, MINUTE, PAIRING_TICKET_TTL } from '../../shared/time/durations.js';
import { serverTime } from '../../shared/http/validation.js';
import { deviceInfoView, deviceSessionView, deviceSummaryView, deviceView, subscriptionView } from '../../shared/http/serializers.js';
import type { Principal } from '../../shared/auth/principal.js';

const ONLINE_WINDOW = 10 * MINUTE;

@Injectable()
export class DevicesService {
  constructor(private readonly repo: DevicesRepository) {}

  // Authorized by the activation ticket (from /activation/validate) in the Authorization header.
  async pair(ticketToken: string | null, input: PairInput) {
    const record = ticketToken ? await this.repo.findActivationByTicketHash(hashToken(ticketToken)) : null;
    const valid =
      record &&
      record.status === 'ISSUED' &&
      record.ticketExpiresAt !== null &&
      record.ticketExpiresAt > new Date() &&
      record.boundDeviceId === input.deviceId;
    if (!record || !valid) throw new UnauthorizedException('Valid activation ticket required');

    const pairingTicket = generateToken();
    const expiresAt = new Date(Date.now() + PAIRING_TICKET_TTL);
    const { device, pairing } = await this.repo.pair({
      workspaceId: record.workspaceId,
      deviceId: input.deviceId,
      info: input.deviceInfo,
      pairingTicketHash: hashToken(pairingTicket),
      pairingExpiresAt: expiresAt,
    });
    return {
      pairingId: pairing.pairingId,
      device: deviceView(device),
      pairingTicket,
      expiresAt: expiresAt.toISOString(),
      serverTime: serverTime(),
    };
  }

  // Authorized by the pairing ticket in the Authorization header.
  async confirm(ticketToken: string | null, input: ConfirmPairInput) {
    if (!input.confirmedOnDevice) throw new BadRequestException('Confirmation on device is required');
    const pairing = ticketToken ? await this.repo.findPairingByTicketHash(hashToken(ticketToken)) : null;
    const valid =
      pairing &&
      pairing.status === 'PENDING' &&
      pairing.expiresAt > new Date() &&
      pairing.pairingId === input.pairingId &&
      pairing.deviceId === input.deviceId;
    if (!pairing || !valid) throw new UnauthorizedException('Valid pairing ticket required');

    const tokens = issueTokens(DEVICE_ACCESS_TTL, DEVICE_REFRESH_TTL);
    const result = await this.repo.confirm({
      workspaceId: pairing.workspaceId,
      deviceId: input.deviceId,
      pairingId: input.pairingId,
      session: {
        accessTokenHash: tokens.accessTokenHash,
        refreshTokenHash: tokens.refreshTokenHash,
        accessExpiresAt: tokens.accessExpiresAt,
        refreshExpiresAt: tokens.refreshExpiresAt,
      },
    });
    return {
      device: deviceView(result.device),
      session: deviceSessionView(result.session, tokens),
      subscription: subscriptionView(result.subscription),
      serverTime: serverTime(),
    };
  }

  async refresh(input: RefreshInput) {
    const tokens = issueTokens(DEVICE_ACCESS_TTL, DEVICE_REFRESH_TTL);
    const result = await this.repo.rotateSession({
      deviceId: input.deviceId,
      refreshTokenHash: hashToken(input.refreshToken),
      next: {
        accessTokenHash: tokens.accessTokenHash,
        refreshTokenHash: tokens.refreshTokenHash,
        accessExpiresAt: tokens.accessExpiresAt,
        refreshExpiresAt: tokens.refreshExpiresAt,
      },
    });
    if (result.outcome !== 'rotated') throw new UnauthorizedException('Invalid or reused refresh token');
    return deviceSessionView(result.session, tokens);
  }

  async heartbeat(principal: Principal, input: HeartbeatInput) {
    if (input.deviceId !== principal.deviceId) throw new ForbiddenException('Heartbeat device mismatch');
    const now = new Date();
    await this.repo.recordHeartbeat(principal.deviceId, {
      batteryLevel: input.batteryLevel,
      networkType: input.networkType,
      at: now,
    });
    const subscription = await this.repo.getSubscription(principal.workspaceId);
    if (!subscription) throw new ConflictException('No subscription for workspace');
    return {
      serverReceivedAt: now.toISOString(),
      connectionState: 'ONLINE' as const,
      subscription: subscriptionView(subscription),
    };
  }

  async revoke(principal: Principal, input: RevokeInput) {
    const device = await this.repo.revoke(principal.workspaceId, input.deviceId);
    if (!device) throw new NotFoundException('Device not found in workspace');
    return { device: deviceView(device), serverTime: serverTime() };
  }

  // Account-scoped: lists devices in the caller's workspace (for the web console).
  async list(principal: Principal) {
    const devices = await this.repo.listByWorkspace(principal.workspaceId);
    return { devices: devices.map(deviceSummaryView), serverTime: serverTime() };
  }

  async me(principal: Principal) {
    if (!principal.deviceId) throw new UnauthorizedException('Device session required');
    const device = await this.repo.getDevice(principal.deviceId);
    if (!device) throw new NotFoundException('Device not found');
    const connectionState = !device.lastSyncAt
      ? ('UNKNOWN' as const)
      : Date.now() - device.lastSyncAt.getTime() <= ONLINE_WINDOW
        ? ('ONLINE' as const)
        : ('OFFLINE' as const);
    return {
      device: deviceView(device),
      deviceInfo: deviceInfoView(device),
      connectionState,
      lastSync: device.lastSyncAt ? device.lastSyncAt.toISOString() : null,
      serverTime: serverTime(),
    };
  }
}
