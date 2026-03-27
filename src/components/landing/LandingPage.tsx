type LandingPageProps = {
  onOpenRules: () => void;
  onQuickStart: () => void;
  isReady: boolean;
};

export function LandingPage({ onOpenRules, onQuickStart, isReady }: LandingPageProps) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
          Football Draft
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-6xl">
          Construis ton équipe et affronte une IA en draft rapide.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
          Sélectionne 5 joueurs pour composer ton équipe, puis lance une simulation de match
          avec score en direct et résumé final.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenRules}
            disabled={!isReady}
            className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isReady ? 'Choisir les règles' : 'Chargement...'}
          </button>
          <button
            type="button"
            onClick={onQuickStart}
            disabled={!isReady}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Démarrage rapide
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Draft rapide</p>
            <p className="mt-2 text-sm text-slate-400">
              5 choix contre une IA simple et lisible
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Règles</p>
            <p className="mt-2 text-sm text-slate-400">Format 5 vs 5</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Match live</p>
            <p className="mt-2 text-sm text-slate-400">
              Chrono rapide, événements et score évolutif
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
