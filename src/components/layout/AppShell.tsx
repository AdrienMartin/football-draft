import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
              Draft League
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Jeu de draft de football
            </h1>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
