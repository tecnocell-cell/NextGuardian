'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { listDevices, type DeviceSummary } from '@/lib/api';
import { presenceOf, presenceLabel } from '@/lib/presence';

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDevices().then((r) => setDevices(r.devices)).catch(() => setError('Não foi possível carregar os dispositivos.'));
  }, []);

  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-6">Dispositivos</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {!devices ? (
        <div className="text-slate-500">Carregando…</div>
      ) : devices.length === 0 ? (
        <div className="text-slate-500">Nenhum dispositivo vinculado. Use <Link className="underline" href="/enrollment">Vincular dispositivo</Link>.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Presença</th><th className="px-4 py-3">Bateria</th>
                <th className="px-4 py-3">Última sync</th><th className="px-4 py-3">Versão</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const p = presenceOf(d.lastSync);
                return (
                  <tr key={d.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <Link className="font-medium hover:underline" href={`/devices/${d.id}`}>{d.name}</Link>
                      <div className="text-xs text-slate-500">{d.manufacturer} {d.model}</div>
                    </td>
                    <td className="px-4 py-3">{d.pairingState}</td>
                    <td className="px-4 py-3">{presenceLabel(p)}</td>
                    <td className="px-4 py-3">{d.batteryLevel == null ? '—' : `${d.batteryLevel}%`}</td>
                    <td className="px-4 py-3">{d.lastSync ? new Date(d.lastSync).toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3">{d.appVersion}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
