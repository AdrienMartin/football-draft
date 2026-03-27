import type { Player } from '../../types/player';
import { TeamPitch } from './TeamPitch';

type MatchPreviewProps = {
  userTeam: Player[];
  aiTeam: Player[];
  onPlay: () => void;
  onResetDraft: () => void;
};

export function MatchPreview({
  userTeam,
  aiTeam,
  onPlay,
  onResetDraft,
}: MatchPreviewProps) {
  const userValue = userTeam.reduce((sum, player) => sum + player.value, 0);
  const aiValue = aiTeam.reduce((sum, player) => sum + player.value, 0);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="text-2xl font-semibold text-white">Simulation du match</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Les équipes sont prêtes. Tu peux voir leur disposition sur le terrain avant de lancer
        un match rapide avec chronomètre et évolution du score.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TeamPitch title="Ton équipe" players={userTeam} side="left" />
        <TeamPitch title="Équipe IA" players={aiTeam} side="right" />
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
          <p className="text-sm text-slate-400">match rapide</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Enjeu</p>
          <p className="mt-2 text-lg font-semibold text-white">Victoire directe</p>
          <p className="text-sm text-slate-400">score et résumé final</p>
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
        <button
          type="button"
          onClick={onResetDraft}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Nouvelle draft
        </button>
      </div>
    </section>
  );
}
