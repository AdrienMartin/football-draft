import type { Player } from '../../types/player';
import {
  getNationalityFlagCode,
  getNationalityLabel,
} from '../../lib/players/formatters';

const TRANSFERMARKT_ICON_URL = 'https://www.transfermarkt.fr/favicon.ico';

const STAT_DESCRIPTIONS = {
  PAC: 'Vitesse et explosivité du joueur dans ses courses.',
  TIR: 'Qualité de finition, volume de tir et menace devant le but.',
  PAS: 'Qualité de passe, création et capacité à faire progresser le jeu.',
  DRI: 'Qualité de conduite de balle, de dribble et de percussion.',
  DEF: 'Impact défensif, tacles, interceptions et lecture du jeu.',
  PHY: 'Puissance, impact dans les duels et présence physique.',
  GK: 'Niveau global du gardien sur sa ligne et dans la surface.',
  DIS: 'Qualité de relance et de distribution du gardien.',
  REF: 'Réflexes du gardien sur les tirs rapides et à bout portant.',
  MAI: 'Qualité de main du gardien pour capter ou repousser les ballons.',
  AER: 'Présence aérienne du gardien dans les sorties et les centres.',
} satisfies Record<string, string>;

type StatLabel = keyof typeof STAT_DESCRIPTIONS;
type StatItem = {
  label: StatLabel;
  value: number;
};

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
  const statItems: StatItem[] =
    player.position === 'GK'
      ? [
          { label: 'PAC', value: player.stats.pace },
          { label: 'DIS', value: player.stats.distribution ?? player.stats.passing },
          { label: 'REF', value: player.stats.reflexes ?? player.stats.goalkeeping ?? 0 },
          { label: 'MAI', value: player.stats.handling ?? player.stats.goalkeeping ?? 0 },
          { label: 'AER', value: player.stats.aerial ?? player.stats.physical },
          { label: 'GK', value: player.stats.goalkeeping ?? 0 },
        ]
      : [
          { label: 'PAC', value: player.stats.pace },
          { label: 'TIR', value: player.stats.shooting },
          { label: 'PAS', value: player.stats.passing },
          { label: 'DRI', value: player.stats.dribbling },
          { label: 'DEF', value: player.stats.defense },
          { label: 'PHY', value: player.stats.physical },
        ];

  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-white">{player.name}</p>
            {player.transfermarktUrl && (
              <a
                href={player.transfermarktUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Voir ${player.name} sur Transfermarkt`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
              >
                <img
                  src={TRANSFERMARKT_ICON_URL}
                  alt=""
                  className="h-3.5 w-3.5 rounded-sm"
                />
              </a>
            )}
          </div>
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

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-3 xl:grid-cols-6">
        {statItems.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white/5 p-3">
            <dt className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
              <span>{stat.label}</span>
              <span className="group relative inline-flex">
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={`Aide sur la statistique ${stat.label}`}
                  title={STAT_DESCRIPTIONS[stat.label]}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-slate-300 outline-none transition hover:bg-white/10 focus:bg-white/10"
                >
                  ?
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-[11px] normal-case tracking-normal text-slate-200 shadow-xl group-hover:block group-focus-within:block">
                  {STAT_DESCRIPTIONS[stat.label]}
                </span>
              </span>
            </dt>
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
