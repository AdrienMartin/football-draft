import { getPlayerRole } from '../../lib/game/draft';
import {
  formatTeamValue,
  getNationalityLabel,
} from '../../lib/players/formatters';
import type { Player } from '../../types/player';

type TeamPitchProps = {
  title: string;
  players: Player[];
  side: 'left' | 'right';
  compact?: boolean;
};

const roleRows = ['FWD', 'MID', 'DEF', 'GK'] as const;

export function TeamPitch({ title, players, side, compact = false }: TeamPitchProps) {
  const averageRating =
    players.length > 0
      ? Math.round(players.reduce((sum, player) => sum + player.rating, 0) / players.length)
      : 0;
  const totalValue = players.reduce((sum, player) => sum + player.value, 0);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">{title}</h3>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200">
            {formatTeamValue(totalValue)}
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
            GEN {averageRating}
          </div>
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-[28px] border border-emerald-300/15 bg-[linear-gradient(180deg,_#166534_0%,_#15803d_100%)] ${compact ? 'px-3 py-4' : 'px-4 py-6'}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_35%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div
          className={`pointer-events-none absolute ${side === 'left' ? 'left-0 border-r' : 'right-0 border-l'} top-1/2 h-28 w-12 -translate-y-1/2 border-white/25`}
        />

        <div className={`relative ${compact ? 'space-y-4' : 'space-y-5'}`}>
          {roleRows.map((role) => {
            const rowPlayers = players.filter((player) => getPlayerRole(player.position) === role);

            return (
              <div key={role}>
                <div className="flex min-h-20 items-center justify-center gap-3">
                  {rowPlayers.map((player) => (
                    <article
                      key={player.id}
                      className={`${compact ? 'w-24 px-2 py-2' : 'w-28 px-3 py-2'} rounded-2xl border border-white/15 bg-[linear-gradient(180deg,_rgba(2,6,23,0.58),_rgba(2,6,23,0.4))] text-center shadow-lg shadow-black/20`}
                    >
                      <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-white`}>
                        {player.name}
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <p className="text-[10px] text-emerald-100/80">{player.position}</p>
                        <span className="rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          {player.rating}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-300">
                        {getNationalityLabel(player.nationality)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
