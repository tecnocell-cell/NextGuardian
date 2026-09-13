// Pure, deterministic and explainable compliance + risk scoring (doc 16).
// Every point of the score carries a human-readable reason.

export interface RiskWeights {
  notPaired: number;
  offlineTooLong: number;
  agentOutdated: number;
  neverSeen: number;
  revoked: number;
}

export const DEFAULT_RISK_WEIGHTS: RiskWeights = {
  notPaired: 40,
  offlineTooLong: 25,
  agentOutdated: 15,
  neverSeen: 10,
  revoked: 50,
};

export interface PolicyThresholds {
  minAppVersion: string;
  maxOfflineHours: number;
  weights?: RiskWeights;
}

export interface DevicePosture {
  pairingState: string;
  appVersion: string;
  lastSyncAt: Date | null;
}

export interface RiskReason {
  code: string;
  label: string;
  weight: number;
}

export type Compliance = 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';

export interface RiskResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  compliance: Compliance;
  reasons: RiskReason[];
}

// Compares dotted versions by numeric segments, ignoring any non-numeric suffix (e.g. "-demo").
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(s => parseInt(s, 10) || 0);
  const pb = b.split('.').map(s => parseInt(s, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

const HOUR = 3_600_000;

export function evaluateRisk(device: DevicePosture, policy: PolicyThresholds, now: Date): RiskResult {
  const weights = policy.weights ?? DEFAULT_RISK_WEIGHTS;
  const reasons: RiskReason[] = [];

  if (device.pairingState === 'REVOKED') {
    reasons.push({ code: 'ENROLLMENT_REVOKED', label: 'Vínculo revogado', weight: weights.revoked });
  } else if (device.pairingState !== 'PAIRED') {
    reasons.push({ code: 'NOT_PAIRED', label: 'Dispositivo não vinculado', weight: weights.notPaired });
  }

  let neverSeen = false;
  if (device.lastSyncAt === null) {
    neverSeen = true;
    reasons.push({ code: 'NEVER_SEEN', label: 'Sem primeira sincronização', weight: weights.neverSeen });
  } else {
    const hours = (now.getTime() - device.lastSyncAt.getTime()) / HOUR;
    if (hours > policy.maxOfflineHours) {
      reasons.push({ code: 'OFFLINE_TOO_LONG', label: `Sem comunicação há mais de ${policy.maxOfflineHours}h`, weight: weights.offlineTooLong });
    }
  }

  if (compareVersions(device.appVersion, policy.minAppVersion) < 0) {
    reasons.push({ code: 'AGENT_OUTDATED', label: `Agente abaixo de ${policy.minAppVersion}`, weight: weights.agentOutdated });
  }

  const score = Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0));
  const level = score < 30 ? 'low' : score < 70 ? 'medium' : 'high';
  const violations = reasons.filter(r => r.code !== 'NEVER_SEEN');
  const compliance: Compliance = violations.length > 0 ? 'NON_COMPLIANT' : neverSeen ? 'UNKNOWN' : 'COMPLIANT';

  return { score, level, compliance, reasons };
}
