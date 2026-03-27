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
  opponentLabel = 'Equipe adverse',
  onPlay,
}: MatchPreviewProps) {
  const userValue = userTeam.reduce((sum, player) => sum + player.value, 0);
  const aiValue = aiTeam.reduce((sum, player) => sum + player.value, 0);

  return (
    <section className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="text-2xl font-semibold text-white">Simulation du match</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Les equipes sont pretes. Chaque joueur doit confirmer le lancement pour demarrer un
        deroule synchronise.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TeamPitch title="Ton equipe" players={userTeam} side="left" />
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
          <p className="text-sm text-slate-400">match synchronise</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lancement</p>
          <p className="mt-2 text-lg font-semibold text-white">Validation des 2 joueurs</p>
          <p className="text-sm text-slate-400">depart commun du chrono</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Lancer la simulation
        </button>
      </div>
    </section>
  );
}
