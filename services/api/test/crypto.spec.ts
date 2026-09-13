import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  generateActivationCode,
} from '../src/shared/crypto/secrets.js';

describe('secrets', () => {
  it('hashes and verifies passwords without storing the plaintext', () => {
    const stored = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse battery', stored)).toBe(true);
    expect(verifyPassword('wrong', stored)).toBe(false);
    expect(stored).not.toContain('correct horse battery');
    expect(stored.startsWith('scrypt$')).toBe(true);
  });

  it('uses a distinct salt per hash', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(verifyPassword('x', 'garbage')).toBe(false);
    expect(verifyPassword('x', 'scrypt$1$a$b')).toBe(false);
  });

  it('generates opaque tokens with stable, non-reversible hashes', () => {
    const token = generateToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(generateToken()).not.toBe(token);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });

  it('generates typeable activation codes with no ambiguous characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateActivationCode()).toMatch(/^NG-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });
});
