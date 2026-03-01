'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const items = [
  ['Dashboard', '/'],
  ['Notes', '/notes'],
  ['News', '/news'],
  ['Dictionary', '/dictionary'],
  ['Assistant', '/assistant'],
  ['Focus', '/focus']
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-6 lg:px-8">
      <aside className="hidden w-64 shrink-0 rounded-2xl border border-white/10 bg-black/40 p-4 lg:block">
        <p className="mb-8 text-xs uppercase tracking-[0.24em] text-muted">Ideas OS · v0.1.0</p>
        <nav className="space-y-2">
          {items.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'block rounded-lg px-3 py-2 text-sm transition',
                pathname === href ? 'bg-white/10 text-white' : 'text-muted hover:bg-white/5 hover:text-white'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
