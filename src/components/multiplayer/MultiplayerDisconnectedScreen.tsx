type MultiplayerDisconnectedPhase = 'room' | 'draft' | 'match';

type MultiplayerDisconnectedScreenProps = {
  onBack: () => void;
  phase: MultiplayerDisconnectedPhase;
};

const PHASE_COPY: Record<
  MultiplayerDisconnectedPhase,
  {
    eyebrow: string;
    title: string;
    description: string;
    hint: string;
  }
> = {
  room: {
    eyebrow: 'Room interrompue',
    title: 'L autre joueur ne repond plus',
    description:
      'La room est toujours la, mais l autre joueur semble deconnecte pour le moment.',
    hint: 'S il revient vite, la partie pourra reprendre automatiquement depuis cette room.',
  },
  draft: {
    eyebrow: 'Draft interrompue',
    title: 'La draft est en pause',
    description:
      'L autre joueur semble avoir quitte la partie pendant la draft. On prefere bloquer ici pour eviter une partie desynchronisee.',
    hint: 'Vous pourrez reprendre si le joueur revient, sinon le plus simple est de relancer une nouvelle partie.',
  },
  match: {
    eyebrow: 'Match interrompu',
    title: 'Le duel a ete interrompu',
    description:
      'La connexion de l autre joueur semble coupee juste avant ou pendant le lancement du match.',
    hint: 'Si la reconnexion ne se fait pas rapidement, le plus simple est de revenir a l accueil et de recreer une room.',
  },
};

export function MultiplayerDisconnectedScreen({
  onBack,
  phase,
}: MultiplayerDisconnectedScreenProps) {
  const copy = PHASE_COPY[phase];

  return (
    <section className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-10">
      <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
        <div className="rounded-full border border-red-300/30 bg-red-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-red-100">
          {copy.eyebrow}
        </div>

        <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-red-300/30 bg-red-300/10 text-2xl">
          !
        </div>

        <h2 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-red-50/90">{copy.description}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/75">{copy.hint}</p>

        <button
          type="button"
          onClick={onBack}
          className="mt-8 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          Revenir a l accueil
        </button>
      </div>
    </section>
  );
}
