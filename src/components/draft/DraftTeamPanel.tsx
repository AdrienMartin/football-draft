import {
  formatPlayerCount,
  formatTeamValue,
  getNationalityFlagCode,
  getNationalityLabel,
} from '../../lib/players/formatters';
import type { Player } from '../../types/player';

type DraftTeamPanelProps = {
  title: string;
  players: Player[];
  accentClassName: string;
};

export function DraftTeamPanel({
  title,
  players,
  accentClassName,
}: DraftTeamPanelProps) {
  const totalValue = players.reduce((sum, player) => sum + player.value, 0);
  const averageRating =
    players.length > 0
      ? Math.round(players.reduce((sum, player) => sum + player.rating, 0) / players.length)
      : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">Note moyenne {averageRating}</p>
        </div>
        <div
          className={`rounded-2xl px-3 py-2 text-right text-xs font-semibold ${accentClassName}`}
        >
          <p>{formatPlayerCount(players.length)}</p>
          <p className="mt-1 opacity-80">{formatTeamValue(totalValue)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {players.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
            Aucun joueur sélectionné pour le moment.
          </p>
        )}

        {players.map((player) => {
          const nationalityFlagCode = getNationalityFlagCode(player.nationality);

          return (
            <article
              key={player.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{player.name}</p>
                  <p className="text-xs text-slate-400">
                    {player.position} · {player.club}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      {nationalityFlagCode && (
                        <span className={`fi fi-${nationalityFlagCode} h-3.5 w-[18px] rounded-sm`} />
                      )}
                      <span>{getNationalityLabel(player.nationality)}</span>
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{player.rating}</p>
                  <p className="text-xs text-slate-400">GEN</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
