import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { hashToken } from '../crypto/secrets.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export interface Principal {
  workspaceId: string;
  kind: 'account' | 'device';
  userId?: string;
  deviceId?: string;
}

export function bearer(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const match = /^Bearer (.+)$/.exec(header.trim());
  return match ? match[1] : null;
}

export async function resolveDevicePrincipal(db: PrismaClient, token: string): Promise<Principal | null> {
  const session = await db.deviceSession.findUnique({ where: { accessTokenHash: hashToken(token) } });
  if (!session || session.status !== 'ACTIVE' || session.accessExpiresAt <= new Date()) return null;
  return { workspaceId: session.workspaceId, deviceId: session.deviceId, kind: 'device' };
}

export async function resolveAccountPrincipal(db: PrismaClient, token: string): Promise<Principal | null> {
  const session = await db.session.findUnique({ where: { accessTokenHash: hashToken(token) } });
  if (!session || session.status !== 'ACTIVE' || session.accessExpiresAt <= new Date()) return null;
  return { workspaceId: session.workspaceId, userId: session.userId, kind: 'account' };
}

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal => context.switchToHttp().getRequest().principal,
);
