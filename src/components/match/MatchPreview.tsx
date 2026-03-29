import type { Player } from '../../types/player';
import { TeamPitch } from './TeamPitch';

type MatchPreviewProps = {
  userTeam: Player[];
  aiTeam: Player[];
  opponentLabel?: string;
  onPlay: () => void;
};

export function MatchPreview({
  userTeam,
  aiTeam,
  opponentLabel = 'Équipe adverse',
  onPlay,
}: MatchPreviewProps) {
  const userValue = userTeam.reduce((sum, player) => sum + player.value, 0);
  const aiValue = aiTeam.reduce((sum, player) => sum + player.value, 0);
  const isMultiplayer = opponentLabel !== 'Équipe IA';

  return (
    <section className="relative rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold text-white">Simulation du match</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {isMultiplayer
            ? 'Les équipes sont prêtes. Les deux joueurs doivent confirmer le lancement pour démarrer un déroulé synchronisé.'
            : 'Les équipes sont prêtes. Lance la simulation pour voir le match se dérouler minute par minute.'}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TeamPitch title="Ton équipe" players={userTeam} side="left" />
        <TeamPitch title={opponentLabel} players={aiTeam} side="right" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Valeur</p>
          <p className="mt-2 text-lg font-semibold text-white">{userValue} MEUR</p>
          <p className="text-sm text-slate-400">contre {aiValue} MEUR</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Format</p>
          <p className="mt-2 text-lg font-semibold text-white">5 joueurs</p>
          <p className="text-sm text-slate-400">
            {isMultiplayer ? 'duel synchronisé' : 'match solo'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lancement</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {isMultiplayer ? 'Validation des 2 joueurs' : 'Départ immédiat'}
          </p>
          <p className="text-sm text-slate-400">
            {isMultiplayer ? 'départ commun du chrono' : 'simulation locale'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onPlay}
          className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 sm:w-auto"
        >
          Lancer la simulation
        </button>
      </div>
    </section>
  );
}
