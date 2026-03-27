type LandingPageProps = {
  onOpenRules: () => void;
  onQuickStart: () => void;
  onOpenMultiplayer: () => void;
  isReady: boolean;
};

function ModeCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}

export function LandingPage({
  onOpenRules,
  onQuickStart,
  onOpenMultiplayer,
  isReady,
}: LandingPageProps) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center">
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8 md:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
              Football Draft
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-5xl">
              Construis ton équipe et lance un duel rapide.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Joue en solo contre l’IA ou prépare un 1v1 avec un lien d’invitation simple à
              partager.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300 lg:min-w-[168px]">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Format</p>
            <p className="mt-2 whitespace-nowrap font-semibold text-white">Draft 5 vs 5</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onOpenRules}
            disabled={!isReady}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
          >
            {isReady ? 'Solo avec règles' : 'Chargement...'}
          </button>
          <button
            type="button"
            onClick={onQuickStart}
            disabled={!isReady}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Solo rapide
          </button>
          <button
            type="button"
            onClick={onOpenMultiplayer}
            disabled={!isReady}
            className="w-full rounded-2xl border border-sky-400/30 bg-sky-400/10 px-6 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Duel 1v1
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <ModeCard
            title="Solo"
            description="Draft rapide ou partie avec règles contre une IA simple et lisible."
          />
          <ModeCard
            title="Duel 1v1"
            description="Le host choisit les règles, crée une room, puis partage le lien."
          />
          <ModeCard
            title="Match live"
            description="Chrono en direct, événements minute par minute et score évolutif."
          />
        </div>
      </div>
    </section>
  );
}
