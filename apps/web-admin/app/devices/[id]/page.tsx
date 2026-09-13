'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shell, Card } from '@/components/Shell';
import { listDevices, revokeDevice, type DeviceSummary } from '@/lib/api';
import { presenceOf, presenceLabel } from '@/lib/presence';

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [device, setDevice] = useState<DeviceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listDevices()
      .then((r) => {
        const found = r.devices.find((d) => d.id === params.id) ?? null;
        setDevice(found);
        if (!found) setError('Dispositivo não encontrado.');
      })
      .catch(() => setError('Não foi possível carregar o dispositivo.'));
  }, [params.id]);

  async function onRevoke() {
    if (!device || busy) return;
    if (!confirm('Revogar o vínculo deste dispositivo? As sessões serão invalidadas.')) return;
    setBusy(true);
    try { await revokeDevice(device.id); router.push('/devices'); }
    catch { setError('Não foi possível revogar.'); setBusy(false); }
  }

  return (
    <Shell>
      <button onClick={() => router.push('/devices')} className="text-sm text-slate-500 hover:underline mb-4">← Dispositivos</button>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {device && (
        <>
          <h1 className="text-2xl font-semibold mb-1">{device.name}</h1>
          <p className="text-slate-500 mb-6">{device.manufacturer} {device.model}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Estado">
              <Row k="Vínculo" v={device.pairingState} />
              <Row k="Presença" v={presenceLabel(presenceOf(device.lastSync))} />
              <Row k="Última sincronização" v={device.lastSync ? new Date(device.lastSync).toLocaleString('pt-BR') : '—'} />
            </Card>
            <Card title="Dispositivo">
              <Row k="Android" v={device.androidVersion} />
              <Row k="Versão do agente" v={device.appVersion} />
              <Row k="Bateria" v={device.batteryLevel == null ? '—' : `${device.batteryLevel}%`} />
              <Row k="Rede" v={device.networkType ?? '—'} />
            </Card>
          </div>
          {device.pairingState !== 'REVOKED' && (
            <button onClick={onRevoke} disabled={busy}
              className="mt-6 rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm hover:bg-red-50 disabled:opacity-50">
              {busy ? 'Revogando…' : 'Revogar vínculo'}
            </button>
          )}
        </>
      )}
    </Shell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-500">{k}</span><span className="font-medium">{v}</span>
    </div>
  );
}
