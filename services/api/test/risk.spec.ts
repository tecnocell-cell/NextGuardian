import { evaluateRisk, compareVersions } from '../src/modules/policy/risk.js';

const policy = { minAppVersion: '0.1.0', maxOfflineHours: 24 };
const now = new Date('2026-09-13T12:00:00Z');

describe('compareVersions', () => {
  it('compares numeric segments and ignores suffixes', () => {
    expect(compareVersions('0.1.0-demo', '0.1.0')).toBe(0);
    expect(compareVersions('0.0.9', '0.1.0')).toBe(-1);
    expect(compareVersions('1.0.0', '0.9.9')).toBe(1);
  });
});

describe('evaluateRisk', () => {
  it('is compliant and low risk for a fresh, paired, up-to-date device', () => {
    const r = evaluateRisk({ pairingState: 'PAIRED', appVersion: '0.1.0', lastSyncAt: new Date('2026-09-13T11:59:00Z') }, policy, now);
    expect(r.compliance).toBe('COMPLIANT');
    expect(r.level).toBe('low');
    expect(r.score).toBe(0);
  });

  it('flags offline-too-long with an explainable reason', () => {
    const r = evaluateRisk({ pairingState: 'PAIRED', appVersion: '0.1.0', lastSyncAt: new Date('2026-09-11T00:00:00Z') }, policy, now);
    expect(r.compliance).toBe('NON_COMPLIANT');
    expect(r.reasons.map(x => x.code)).toContain('OFFLINE_TOO_LONG');
    expect(r.score).toBe(25);
  });

  it('flags an outdated agent', () => {
    const r = evaluateRisk({ pairingState: 'PAIRED', appVersion: '0.0.9', lastSyncAt: new Date('2026-09-13T11:59:00Z') }, policy, now);
    expect(r.reasons.map(x => x.code)).toContain('AGENT_OUTDATED');
    expect(r.compliance).toBe('NON_COMPLIANT');
  });

  it('treats a never-synced paired device as UNKNOWN, not a violation', () => {
    const r = evaluateRisk({ pairingState: 'PAIRED', appVersion: '0.1.0', lastSyncAt: null }, policy, now);
    expect(r.compliance).toBe('UNKNOWN');
    expect(r.reasons.map(x => x.code)).toEqual(['NEVER_SEEN']);
  });

  it('accumulates reasons and caps the score at 100', () => {
    const r = evaluateRisk({ pairingState: 'REVOKED', appVersion: '0.0.1', lastSyncAt: new Date('2026-01-01T00:00:00Z') }, policy, now);
    expect(r.compliance).toBe('NON_COMPLIANT');
    expect(r.level).toBe('high');
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.reasons.map(x => x.code)).toEqual(expect.arrayContaining(['ENROLLMENT_REVOKED', 'OFFLINE_TOO_LONG', 'AGENT_OUTDATED']));
  });
});
