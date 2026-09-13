import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

// Password hashing with scrypt (built-in; no external dependency). Format: scrypt$N$salt$hash (base64url).
const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const cost = Number(parts[1]);
  if (!Number.isInteger(cost) || cost < 1024) return false;
  const salt = Buffer.from(parts[2], 'base64url');
  const expected = Buffer.from(parts[3], 'base64url');
  const derived = scryptSync(password, salt, expected.length, { N: cost });
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// Opaque secret tokens. Raw value is returned to the client once; only the hash is stored.
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

// Human-typeable activation code with good entropy; no ambiguous characters.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateActivationCode(): string {
  const bytes = randomBytes(8);
  let body = '';
  for (const byte of bytes) body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `NG-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}
