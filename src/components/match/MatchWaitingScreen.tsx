type MatchWaitingScreenProps = {
  title?: string;
  description?: string;
};

export function MatchWaitingScreen({
  title = 'En attente du second joueur',
  description = 'Ta validation a bien été prise en compte. Le match démarrera dès que l’autre joueur aura lancé la simulation.',
}: MatchWaitingScreenProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
        <h2 className="mt-6 text-3xl font-semibold text-white">{title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </section>
  );
}
