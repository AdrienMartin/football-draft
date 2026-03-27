import type { Player } from '../../types/player';
import {
  getNationalityFlagCode,
  getNationalityLabel,
} from '../../lib/players/formatters';

type PlayerCardProps = {
  player: Player;
  actionLabel?: string;
  onAction?: (player: Player) => void;
  disabled?: boolean;
};

export function PlayerCard({
  player,
  actionLabel,
  onAction,
  disabled = false,
}: PlayerCardProps) {
  const nationalityFlagCode = getNationalityFlagCode(player.nationality);
  const statItems =
    player.position === 'GK'
      ? [
          { label: 'PAC', value: player.stats.pace },
          { label: 'PAS', value: player.stats.passing },
          { label: 'DEF', value: player.stats.defense },
          { label: 'PHY', value: player.stats.physical },
          { label: 'GK', value: player.stats.goalkeeping ?? 0 },
        ]
      : [
          { label: 'PAC', value: player.stats.pace },
          { label: 'TIR', value: player.stats.shooting },
          { label: 'PAS', value: player.stats.passing },
          { label: 'DEF', value: player.stats.defense },
          { label: 'PHY', value: player.stats.physical },
        ];

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-white">{player.name}</p>
          <p className="mt-1 text-sm text-slate-300">
            {player.club} - {player.league}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-400/15 px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">GEN</p>
          <p className="text-xl font-bold text-white">{player.rating}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {player.position}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <span className="inline-flex items-center gap-2">
            {nationalityFlagCode && (
              <span className={`fi fi-${nationalityFlagCode} h-3.5 w-[18px] rounded-sm`} />
            )}
            <span>{getNationalityLabel(player.nationality)}</span>
          </span>
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {player.age} ans
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {player.value} MEUR
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-5">
        {statItems.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</dt>
            <dd className="mt-1 font-semibold text-white">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => onAction(player)}
          disabled={disabled}
          className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}
