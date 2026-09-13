'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getToken, setToken } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Visão geral' },
  { href: '/devices', label: 'Dispositivos' },
  { href: '/enrollment', label: 'Vincular dispositivo' },
  { href: '/subscription', label: 'Assinatura' },
  { href: '/settings', label: 'Configurações' },
];

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
    else setReady(true);
  }, [router]);

  if (!ready) return <div className="p-10 text-slate-500">Carregando…</div>;

  function logout() {
    setToken(null);
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col">
        <div className="text-lg font-semibold px-2 py-3">NextGuardian</div>
        <nav className="flex flex-col gap-1 mt-2">
          {NAV.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="mt-auto text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white px-3 py-2 text-left">
          Sair
        </button>
      </aside>
      <main className="flex-1 p-8 max-w-5xl">{children}</main>
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      {title && <div className="text-sm font-medium text-slate-500 mb-3">{title}</div>}
      {children}
    </div>
  );
}
