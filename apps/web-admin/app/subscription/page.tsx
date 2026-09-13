'use client';
import { useEffect, useState } from 'react';
import { Shell, Card } from '@/components/Shell';
import { getSubscription, type Subscription } from '@/lib/api';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubscription()
      .then((r) => { setSubscription(r.subscription); setLoaded(true); })
      .catch(() => setError('Não foi possível carregar a assinatura.'));
  }, []);

  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-6">Assinatura</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <Card>
        {!loaded ? (
          <div className="text-slate-500">Carregando…</div>
        ) : subscription ? (
          <div className="space-y-2 text-sm">
            <Row k="Estado" v={subscription.state} />
            <Row k="Trial iniciado" v={new Date(subscription.trialStartedAt).toLocaleString('pt-BR')} />
            <Row k="Trial expira" v={new Date(subscription.trialExpiresAt).toLocaleString('pt-BR')} />
          </div>
        ) : (
          <div className="text-slate-500 text-sm">Nenhuma assinatura ativa. Vincule um dispositivo para iniciar o trial.</div>
        )}
      </Card>
    </Shell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-500">{k}</span><span className="font-medium">{v}</span>
    </div>
  );
}
