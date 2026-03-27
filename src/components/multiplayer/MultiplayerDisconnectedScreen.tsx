type MultiplayerDisconnectedScreenProps = {
  onBack: () => void;
};

export function MultiplayerDisconnectedScreen({
  onBack,
}: MultiplayerDisconnectedScreenProps) {
  return (
    <section className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-10">
      <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-300/30 bg-red-300/10 text-2xl">
          !
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-white sm:text-3xl">
          Joueur déconnecté
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-red-50/90">
          L’autre joueur ne répond plus pour le moment. Tu peux revenir à l’accueil et recréer une
          room quand vous serez à nouveau prêts.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          Retour à l’accueil
        </button>
      </div>
    </section>
  );
}
