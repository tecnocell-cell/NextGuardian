'use client';
import { useEffect, useState } from 'react';
import { Shell, Card } from '@/components/Shell';
import { getAccount, listDevices, getSubscription, type AccountMe, type DeviceSummary, type Subscription } from '@/lib/api';
import { presenceOf } from '@/lib/presence';

export default function DashboardPage() {
  const [account, setAccount] = useState<AccountMe | null>(null);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAccount(), listDevices(), getSubscription()])
      .then(([a, d, s]) => { setAccount(a); setDevices(d.devices); setSubscription(s.subscription); })
      .catch(() => setError('Não foi possível carregar os dados.'));
  }, []);

  const counts = devices.reduce(
    (acc, d) => {
      const p = presenceOf(d.lastSync);
      acc[p] = (acc[p] ?? 0) + 1;
      if (d.pairingState === 'PAIRED') acc.paired += 1;
      return acc;
    },
    { ONLINE: 0, RECENT: 0, STALE: 0, OFFLINE: 0, NEVER_SEEN: 0, paired: 0 } as Record<string, number>,
  );

  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-1">Visão geral</h1>
      <p className="text-slate-500 mb-6">{account ? `${account.account.name} · perfil ${account.account.profile}` : '—'}</p>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Dispositivos" value={account?.deviceCount ?? devices.length} />
        <Stat label="Online" value={counts.ONLINE} />
        <Stat label="Recentes" value={counts.RECENT} />
        <Stat label="Offline" value={counts.OFFLINE + counts.STALE + counts.NEVER_SEEN} />
      </div>
      <Card title="Assinatura">
        {subscription
          ? <div className="text-sm">Estado: <b>{subscription.state}</b> · Trial até {new Date(subscription.trialExpiresAt).toLocaleString('pt-BR')}</div>
          : <div className="text-sm text-slate-500">Nenhuma assinatura ativa. Vincule um dispositivo para iniciar o trial.</div>}
      </Card>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}
