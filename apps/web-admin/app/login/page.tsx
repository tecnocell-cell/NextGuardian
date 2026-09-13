'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login, register, setToken, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = mode === 'login' ? await login(email, password) : await register(name, email, password);
      setToken(res.session.accessToken);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'E-mail ou senha inválidos.' : 'Não foi possível concluir. Verifique os dados e a conexão.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
        <div className="text-xl font-semibold mb-1">NextGuardian</div>
        <div className="text-sm text-slate-500 mb-6">{mode === 'login' ? 'Entrar no console' : 'Criar conta'}</div>
        {mode === 'register' && (
          <Field label="Nome" value={name} onChange={setName} type="text" />
        )}
        <Field label="E-mail" value={email} onChange={setEmail} type="email" />
        <Field label="Senha" value={password} onChange={setPassword} type="password" />
        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        <button disabled={busy} className="w-full rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 py-2.5 text-sm font-medium disabled:opacity-50">
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          className="w-full text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mt-4">
          {mode === 'login' ? 'Não tem conta? Criar' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type: string }) {
  return (
    <label className="block mb-4">
      <span className="text-sm text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required
        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400" />
    </label>
  );
}
