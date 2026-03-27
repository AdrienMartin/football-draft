type MatchWaitingScreenProps = {
  title?: string;
  description?: string;
};

export function MatchWaitingScreen({
  title = 'En attente du second joueur',
  description = 'Ta validation a bien été prise en compte. Le match démarrera dès que l’autre joueur aura lancé la simulation.',
}: MatchWaitingScreenProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-10">
      <div className="flex min-h-[320px] flex-col items-center justify-center text-center sm:min-h-[420px]">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
        <h2 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </section>
  );
}
