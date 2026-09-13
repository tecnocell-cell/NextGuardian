import { generateToken, hashToken } from '../crypto/secrets.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

// Issues an opaque access/refresh pair. Raw tokens are returned once; callers persist only the hashes.
export function issueTokens(accessTtlMs: number, refreshTtlMs: number, now: number = Date.now()): IssuedTokens {
  const accessToken = generateToken();
  const refreshToken = generateToken();
  return {
    accessToken,
    refreshToken,
    accessTokenHash: hashToken(accessToken),
    refreshTokenHash: hashToken(refreshToken),
    accessExpiresAt: new Date(now + accessTtlMs),
    refreshExpiresAt: new Date(now + refreshTtlMs),
  };
}
