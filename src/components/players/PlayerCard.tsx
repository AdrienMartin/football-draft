import type { Player } from '../../types/player';
import {
  getNationalityFlagCode,
  getNationalityLabel,
} from '../../lib/players/formatters';

const TRANSFERMARKT_ICON_URL = 'https://www.transfermarkt.fr/favicon.ico';

const STAT_DESCRIPTIONS = {
  Vitesse: 'Vitesse et explosivite du joueur dans ses courses.',
  Finition: 'Qualite de finition, volume de tir et menace devant le but.',
  Passe: 'Qualite de passe, creation et capacite a faire progresser le jeu.',
  Dribble: 'Qualite de conduite de balle, de dribble et de percussion.',
  Defense: 'Impact defensif, tacles, interceptions et lecture du jeu.',
  Physique: 'Puissance, impact dans les duels et presence physique.',
  Vision: 'Qualite de lecture du jeu, creation et derniere passe.',
  'Sang-froid': 'Calme dans les moments importants et qualite de decision.',
  Tacle: 'Qualite dans le duel defensif et les interventions.',
  Placement: 'Placement offensif ou defensif selon le role du joueur.',
  Centres: 'Qualite de centre et capacite a amener le danger depuis le cote.',
  Gardien: 'Niveau global du gardien sur sa ligne et dans la surface.',
  Relance: 'Qualite de relance et de distribution du gardien.',
  Reflexes: 'Reflexes du gardien sur les tirs rapides et a bout portant.',
  Mains: 'Qualite de main du gardien pour capter ou repousser les ballons.',
  Aerien: 'Presence aerienne du gardien dans les sorties et les centres.',
  Arrets: 'Capacite a sortir les frappes et a proteger son but.',
  Surface: 'Maitrise de la surface, des sorties et des ballons aeriens.',
} satisfies Record<string, string>;

type StatLabel = keyof typeof STAT_DESCRIPTIONS;
type StatItem = {
  label: StatLabel;
  value: number;
};

type ProfileTone = {
  badgeClassName: string;
  label: string;
};

type PlayerCardProps = {
  player: Player;
  actionLabel?: string;
  onAction?: (player: Player) => void;
  disabled?: boolean;
};

function getRatingTone(rating: number) {
  if (rating >= 85) {
    return 'border-amber-300/30 bg-amber-300/15 text-amber-100';
  }

  if (rating >= 80) {
    return 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100';
  }

  if (rating >= 75) {
    return 'border-sky-300/25 bg-sky-400/15 text-sky-100';
  }

  return 'border-white/10 bg-white/5 text-slate-200';
}

function getProfileTone(player: Player): ProfileTone {
  if (player.position === 'GK') {
    return {
      label:
        (player.stats.commandOfArea ?? 0) >= (player.stats.shotStopping ?? 0)
          ? 'Gardien de surface'
          : 'Gardien reflexe',
      badgeClassName: 'border-sky-300/20 bg-sky-400/10 text-sky-100',
    };
  }

  if (player.position === 'CB' || player.position === 'CDM') {
    return {
      label:
        player.stats.positioning >= player.stats.tackling
          ? 'Lecteur defensif'
          : 'Gagneur de duels',
      badgeClassName: 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100',
    };
  }

  if (player.position === 'CAM' || player.position === 'CM') {
    return {
      label:
        player.stats.vision >= player.stats.composure
          ? 'Createur'
          : 'Chef d orchestre',
      badgeClassName: 'border-indigo-300/20 bg-indigo-400/10 text-indigo-100',
    };
  }

  if (player.position === 'LW' || player.position === 'RW') {
    return {
      label:
        player.stats.crossing >= player.stats.shooting
          ? 'Percuteur de couloir'
          : 'Ailier decisif',
      badgeClassName: 'border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-100',
    };
  }

  return {
    label:
      player.stats.positioning >= player.stats.composure
        ? 'Finisseur de surface'
        : 'Attaquant complet',
    badgeClassName: 'border-rose-300/20 bg-rose-400/10 text-rose-100',
  };
}

function getStatAccentClass(value: number) {
  if (value >= 88) {
    return 'text-amber-200';
  }

  if (value >= 80) {
    return 'text-emerald-200';
  }

  if (value <= 55) {
    return 'text-rose-200';
  }

  return 'text-white';
}

function getStatItems(player: Player): StatItem[] {
  if (player.position === 'GK') {
    return [
      { label: 'Vitesse', value: player.stats.pace },
      { label: 'Relance', value: player.stats.distribution ?? player.stats.passing },
      { label: 'Reflexes', value: player.stats.reflexes ?? player.stats.goalkeeping ?? 0 },
      { label: 'Mains', value: player.stats.handling ?? player.stats.goalkeeping ?? 0 },
      { label: 'Aerien', value: player.stats.aerial ?? player.stats.physical },
      { label: 'Gardien', value: player.stats.goalkeeping ?? 0 },
      { label: 'Vision', value: player.stats.vision },
      { label: 'Sang-froid', value: player.stats.composure },
      { label: 'Placement', value: player.stats.positioning },
      { label: 'Arrets', value: player.stats.shotStopping ?? player.stats.goalkeeping ?? 0 },
      { label: 'Surface', value: player.stats.commandOfArea ?? player.stats.aerial ?? 0 },
    ];
  }

  return [
    { label: 'Vitesse', value: player.stats.pace },
    { label: 'Finition', value: player.stats.shooting },
    { label: 'Passe', value: player.stats.passing },
    { label: 'Dribble', value: player.stats.dribbling },
    { label: 'Defense', value: player.stats.defense },
    { label: 'Physique', value: player.stats.physical },
    { label: 'Vision', value: player.stats.vision },
    { label: 'Sang-froid', value: player.stats.composure },
    { label: 'Tacle', value: player.stats.tackling },
    { label: 'Placement', value: player.stats.positioning },
    { label: 'Centres', value: player.stats.crossing },
  ];
}

export function PlayerCard({
  player,
  actionLabel,
  onAction,
  disabled = false,
}: PlayerCardProps) {
  const nationalityFlagCode = getNationalityFlagCode(player.nationality);
  const profileTone = getProfileTone(player);
  const statItems = getStatItems(player);

  return (
    <article className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(15,23,42,0.78))] p-5 shadow-xl shadow-black/20">
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

        <div className={`rounded-2xl border px-3 py-2 text-center ${getRatingTone(player.rating)}`}>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">GEN</p>
          <p className="text-2xl font-bold text-white">{player.rating}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
        <span className={`rounded-full border px-3 py-1 ${profileTone.badgeClassName}`}>
          {profileTone.label}
        </span>
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
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <dt className="flex items-center gap-1 text-xs tracking-wide text-slate-400">
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
            <dd className={`mt-1 font-semibold ${getStatAccentClass(stat.value)}`}>{stat.value}</dd>
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
