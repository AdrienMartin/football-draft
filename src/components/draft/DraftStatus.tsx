import type { DraftTurn } from '../../lib/game/draft';
import type { Player } from '../../types/player';

type DraftStatusProps = {
  currentTurn: DraftTurn;
  isComplete: boolean;
  lastPick: {
    team: DraftTurn;
    player: Player;
  } | null;
  title?: string;
  description?: string;
};

export function DraftStatus({
  currentTurn,
  isComplete,
  lastPick,
  title = 'Draft joueur contre IA',
  description = 'Chaque équipe choisit 5 joueurs à tour de rôle. L’IA prend le meilleur joueur disponible selon sa note.',
}: DraftStatusProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{description}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tour actuel</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {isComplete ? 'Draft terminée' : currentTurn === 'user' ? 'À toi de choisir' : 'Tour adverse'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dernier choix</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {lastPick ? `${lastPick.player.name} (${lastPick.team === 'user' ? 'toi' : 'adversaire'})` : 'Aucun choix'}
          </p>
        </div>
      </div>
    </section>
  );
}
