'use client';
import { useEffect, useState } from 'react';
import { Shell, Card } from '@/components/Shell';
import { getAccount, type AccountMe } from '@/lib/api';

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountMe | null>(null);
  useEffect(() => { getAccount().then(setAccount).catch(() => undefined); }, []);

  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-6">Configurações</h1>
      <Card title="Conta">
        {account ? (
          <div className="space-y-2 text-sm">
            <Row k="Workspace" v={account.account.name} />
            <Row k="Perfil" v={account.account.profile} />
            <Row k="Usuário" v={account.user.name} />
            <Row k="E-mail" v={account.user.email} />
          </div>
        ) : <div className="text-slate-500 text-sm">Carregando…</div>}
      </Card>
      <Card title="Privacidade e transparência">
        <p className="text-sm text-slate-500">
          O NextGuardian coleta apenas telemetria técnica mínima e localização quando explicitamente consentida.
          Nada de captura clandestina. Você pode revogar o vínculo de um dispositivo a qualquer momento em Dispositivos.
        </p>
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
