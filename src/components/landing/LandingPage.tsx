type LandingPageProps = {
  onOpenRules: () => void;
  onQuickStart: () => void;
  onOpenMultiplayer: () => void;
  isReady: boolean;
};

export function LandingPage({
  onOpenRules,
  onQuickStart,
  onOpenMultiplayer,
  isReady,
}: LandingPageProps) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
          Football Draft
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
          Construis ton équipe et affronte un ami ou une IA.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
          Joue en solo contre l’IA ou prépare un duel 1v1 avec un lien d’invitation simple à
          partager.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenRules}
            disabled={!isReady}
            className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isReady ? 'Solo avec règles' : 'Chargement...'}
          </button>
          <button
            type="button"
            onClick={onQuickStart}
            disabled={!isReady}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Solo rapide
          </button>
          <button
            type="button"
            onClick={onOpenMultiplayer}
            disabled={!isReady}
            className="rounded-2xl border border-sky-400/30 bg-sky-400/10 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Duel 1v1
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Solo</p>
            <p className="mt-2 text-sm text-slate-400">
              Draft rapide ou avec règles contre une IA simple et lisible.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Duel 1v1</p>
            <p className="mt-2 text-sm text-slate-400">
              Le host choisit les règles, crée une room et partage un lien.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Match live</p>
            <p className="mt-2 text-sm text-slate-400">
              Chrono en direct, événements de match et score évolutif.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
