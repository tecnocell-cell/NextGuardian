'use client';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Shell, Card } from '@/components/Shell';
import {
  listDevices, revokeDevice, deviceTimeline, listDeviceCommands, enqueueCommand,
  type DeviceSummary, type EventView, type CommandView, type CommandType,
} from '@/lib/api';
import { presenceOf, presenceLabel } from '@/lib/presence';

const QUICK_COMMANDS: { type: CommandType; label: string }[] = [
  { type: 'REQUEST_CHECKIN', label: 'Solicitar check-in' },
  { type: 'SYNC_NOW', label: 'Sincronizar agora' },
  { type: 'RING_DEVICE', label: 'Tocar aparelho' },
  { type: 'REFRESH_DEVICE_INFO', label: 'Atualizar info' },
];

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [device, setDevice] = useState<DeviceSummary | null>(null);
  const [events, setEvents] = useState<EventView[]>([]);
  const [commands, setCommands] = useState<CommandView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [devs, tl, cmds] = await Promise.all([listDevices(), deviceTimeline(params.id), listDeviceCommands(params.id)]);
      const found = devs.devices.find((d) => d.id === params.id) ?? null;
      setDevice(found);
      setEvents(tl.events);
      setCommands(cmds.commands);
      if (!found) setError('Dispositivo não encontrado.');
    } catch {
      setError('Não foi possível carregar o dispositivo.');
    }
  }, [params.id]);

  useEffect(() => { void load(); }, [load]);

  async function send(type: CommandType) {
    if (busy) return;
    let payload: { text: string } | undefined;
    if (type === 'SHOW_MESSAGE') {
      const text = prompt('Mensagem a exibir no aparelho:');
      if (!text) return;
      payload = { text };
    }
    setBusy(true);
    try { await enqueueCommand(params.id, type, payload); await load(); }
    catch { setError('Não foi possível enviar o comando.'); }
    finally { setBusy(false); }
  }

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

          <div className="mt-4">
            <Card title="Comandos">
              {device.pairingState === 'PAIRED' ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {QUICK_COMMANDS.map((c) => (
                    <button key={c.type} disabled={busy} onClick={() => send(c.type)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
                      {c.label}
                    </button>
                  ))}
                  <button disabled={busy} onClick={() => send('SHOW_MESSAGE')}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
                    Enviar mensagem…
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mb-2">Comandos disponíveis apenas para dispositivos vinculados.</p>
              )}
              {commands.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum comando ainda.</p>
              ) : (
                <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                  {commands.map((c) => (
                    <li key={c.id} className="py-2 flex justify-between">
                      <span>{c.type}{typeof (c.payload as { text?: string })?.text === 'string' ? `: "${(c.payload as { text: string }).text}"` : ''}</span>
                      <span className="text-slate-500">{c.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="mt-4">
            <Card title="Timeline">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500">Sem eventos.</p>
              ) : (
                <ul className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                  {events.map((e) => (
                    <li key={e.id} className="py-2 flex justify-between gap-4">
                      <span><span className="text-slate-400">[{e.category}]</span> {e.type}</span>
                      <span className="text-slate-500 whitespace-nowrap">{new Date(e.occurredAt).toLocaleString('pt-BR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {device.pairingState !== 'REVOKED' && (
            <button onClick={onRevoke} disabled={busy}
              className="mt-6 rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm hover:bg-red-50 disabled:opacity-50">
              {busy ? 'Processando…' : 'Revogar vínculo'}
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
