import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ActivationRepository } from './activation.repository.js';
import { normalizeCode, type ValidateActivationInput } from './activation.dto.js';
import { generateToken, hashToken } from '../../shared/crypto/secrets.js';
import { ACTIVATION_TICKET_TTL, MAX_ACTIVATION_ATTEMPTS } from '../../shared/time/durations.js';
import { serverTime } from '../../shared/http/validation.js';

@Injectable()
export class ActivationService {
  constructor(private readonly repo: ActivationRepository) {}

  // Anonymous: the activation code itself is the authorization (identifies the workspace).
  async validate(input: ValidateActivationInput) {
    const record = await this.repo.findByCodeHash(hashToken(normalizeCode(input.code)));
    if (!record) throw new BadRequestException('Invalid activation code');
    if (record.attempts >= MAX_ACTIVATION_ATTEMPTS) {
      throw new HttpException('Too many activation attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (record.status !== 'ISSUED') throw new BadRequestException('Activation code already used');
    if (record.expiresAt <= new Date()) {
      await this.repo.markExpired(record.activationCodeId);
      throw new BadRequestException('Activation code expired');
    }
    const workspace = await this.repo.getWorkspace(record.workspaceId);
    const ticket = generateToken();
    const ticketExpiresAt = new Date(Date.now() + ACTIVATION_TICKET_TTL);
    await this.repo.bindTicket(record.activationCodeId, {
      boundDeviceId: input.deviceId,
      ticketHash: hashToken(ticket),
      ticketExpiresAt,
    });
    return {
      activationTicket: ticket,
      accountDisplayName: workspace?.name ?? 'Conta',
      expiresAt: ticketExpiresAt.toISOString(),
      serverTime: serverTime(),
    };
  }
}
