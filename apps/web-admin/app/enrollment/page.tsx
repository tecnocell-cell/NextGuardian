'use client';
import { useState } from 'react';
import { Shell, Card } from '@/components/Shell';
import { issueActivationCode } from '@/lib/api';

export default function EnrollmentPage() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true);
    setError(null);
    try {
      const res = await issueActivationCode();
      setCode(res.value);
      setExpiresAt(res.expiresAt);
    } catch {
      setError('Não foi possível emitir o código.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-1">Vincular dispositivo</h1>
      <p className="text-slate-500 mb-6">Gere um código de ativação e informe-o no aplicativo NextGuardian instalado no aparelho.</p>
      <Card>
        <button onClick={issue} disabled={busy}
          className="rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 text-sm font-medium disabled:opacity-50">
          {busy ? 'Gerando…' : 'Gerar código de ativação'}
        </button>
        {error && <div className="text-red-600 mt-4">{error}</div>}
        {code && (
          <div className="mt-6">
            <div className="text-3xl font-mono tracking-widest">{code}</div>
            <div className="text-sm text-slate-500 mt-2">
              Válido até {expiresAt ? new Date(expiresAt).toLocaleString('pt-BR') : '—'}. Uso único.
            </div>
          </div>
        )}
      </Card>
      <ol className="text-sm text-slate-500 mt-6 list-decimal pl-5 space-y-1">
        <li>Abra o app NextGuardian no aparelho a vincular.</li>
        <li>Toque em ativar e digite o código acima.</li>
        <li>Confirme o vínculo no aparelho; ele aparecerá em Dispositivos.</li>
      </ol>
    </Shell>
  );
}
