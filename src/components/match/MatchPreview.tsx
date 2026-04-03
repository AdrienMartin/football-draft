import type { Player } from '../../types/player';
import { TeamPitch } from './TeamPitch';

type MatchPreviewProps = {
  userTeam: Player[];
  aiTeam: Player[];
  isMultiplayer?: boolean;
  opponentLabel?: string;
  onPlay: () => void;
};

export function MatchPreview({
  userTeam,
  aiTeam,
  isMultiplayer = false,
  opponentLabel = 'Equipe adverse',
  onPlay,
}: MatchPreviewProps) {
  return (
    <section className="relative rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),_transparent_30%),rgba(255,255,255,0.05)] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">Simulation du match</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {isMultiplayer
            ? 'Les equipes sont pretes. Les deux joueurs doivent confirmer le lancement pour demarrer un deroule synchronise.'
            : 'Les equipes sont pretes. Lance la simulation pour voir le match se derouler minute par minute.'}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TeamPitch title="Ton equipe" players={userTeam} side="left" />
        <TeamPitch title={opponentLabel} players={aiTeam} side="right" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lancement</p>
        <p className="mt-2 text-lg font-semibold text-white">
          {isMultiplayer ? 'Validation des 2 joueurs' : 'Depart immediat'}
        </p>
        {isMultiplayer && <p className="text-sm text-slate-400">depart commun du chrono</p>}
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
