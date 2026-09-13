export type Presence = 'ONLINE' | 'RECENT' | 'STALE' | 'OFFLINE' | 'NEVER_SEEN';

const MIN = 60_000;

// Derived presence from last sync freshness (server has no continuous connection guarantee).
export function presenceOf(lastSync: string | null): Presence {
  if (!lastSync) return 'NEVER_SEEN';
  const age = Date.now() - new Date(lastSync).getTime();
  if (age <= 10 * MIN) return 'ONLINE';
  if (age <= 60 * MIN) return 'RECENT';
  if (age <= 24 * 60 * MIN) return 'STALE';
  return 'OFFLINE';
}

export function presenceLabel(p: Presence): string {
  return { ONLINE: 'Online', RECENT: 'Recente', STALE: 'Inativo', OFFLINE: 'Offline', NEVER_SEEN: 'Nunca visto' }[p];
}
