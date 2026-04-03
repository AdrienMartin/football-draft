import type { PlayerRole } from '../../lib/game/draft';
import { getClubBadgeUrl, getLeagueBadgeUrl } from '../../lib/assets/badges';
import {
  formatLeagueLabel,
  formatPlayerCount,
  getNationalityLabel,
} from '../../lib/players/formatters';
import type { Player } from '../../types/player';
import { PlayerCard } from '../players/PlayerCard';

type DraftAvailablePlayersProps = {
  filteredPlayers: Player[];
  totalFilteredPlayers: number;
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  availableRoleFilters: Array<'ALL' | PlayerRole>;
  selectedRole: 'ALL' | PlayerRole;
  onSelectRole: (role: 'ALL' | PlayerRole) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  nationalityOptions: string[];
  selectedNationality: string;
  onSelectNationality: (value: string) => void;
  isNationalityLocked: boolean;
  leagueOptions: string[];
  selectedLeague: string;
  onSelectLeague: (value: string) => void;
  isLeagueLocked: boolean;
  clubOptions: string[];
  selectedClub: string;
  onSelectClub: (value: string) => void;
  minAge: string;
  maxAge: string;
  onMinAgeChange: (value: string) => void;
  onMaxAgeChange: (value: string) => void;
  minValue: string;
  maxValue: string;
  onMinValueChange: (value: string) => void;
  onMaxValueChange: (value: string) => void;
  onResetFilters: () => void;
  sortOption: 'rating-desc' | 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc';
  onSelectSort: (
    value: 'rating-desc' | 'value-desc' | 'value-asc' | 'name-asc' | 'name-desc',
  ) => void;
  requiredRoles: PlayerRole[];
  maxTeamValue: number | null;
  currentTeamValue: number;
  canPick: boolean;
  onPick: (playerId: number) => void;
};

export function DraftAvailablePlayers({
  filteredPlayers,
  totalFilteredPlayers,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  availableRoleFilters,
  selectedRole,
  onSelectRole,
  searchQuery,
  onSearchQueryChange,
  nationalityOptions,
  selectedNationality,
  onSelectNationality,
  isNationalityLocked,
  leagueOptions,
  selectedLeague,
  onSelectLeague,
  isLeagueLocked,
  clubOptions,
  selectedClub,
  onSelectClub,
  minAge,
  maxAge,
  onMinAgeChange,
  onMaxAgeChange,
  minValue,
  maxValue,
  onMinValueChange,
  onMaxValueChange,
  onResetFilters,
  sortOption,
  onSelectSort,
  requiredRoles,
  maxTeamValue,
  currentTeamValue,
  canPick,
  onPick,
}: DraftAvailablePlayersProps) {
  const selectedLeagueBadgeUrl =
    selectedLeague !== 'ALL' ? getLeagueBadgeUrl(selectedLeague) : null;
  const selectedClubBadgeUrl =
    selectedLeague !== 'ALL' && selectedClub !== 'ALL'
      ? getClubBadgeUrl(selectedClub, selectedLeague)
      : null;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          {maxTeamValue !== null && <p>Budget : {currentTeamValue} / {maxTeamValue} MEUR</p>}
          <p className={maxTeamValue !== null ? 'mt-2' : undefined}>
            {requiredRoles.length > 0
              ? `${requiredRoles.length > 1 ? 'Postes manquants' : 'Poste manquant'} : ${requiredRoles.join(', ')}`
              : 'Tous les postes minimum sont deja couverts.'}
          </p>
        </div>
      </div>

      <div className="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {availableRoleFilters.map((role) => {
            const isActive = selectedRole === role;

            return (
              <button
                key={role}
                type="button"
                onClick={() => onSelectRole(role)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950'
                    : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                {role}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-14">
          <div className="grid gap-3 md:grid-cols-2 xl:col-span-7">
            <label className="text-sm text-slate-300">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                Recherche
              </span>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  placeholder="Nom du joueur"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 pr-11 text-sm text-white outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchQueryChange('')}
                    aria-label="Reinitialiser la recherche"
                    className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    x
                  </button>
                )}
              </div>
            </label>

            <label className="text-sm text-slate-300">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
                Nationalite
              </span>
              <select
                value={selectedNationality}
                onChange={(event) => onSelectNationality(event.target.value)}
                disabled={isNationalityLocked}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="ALL">Toutes</option>
                {nationalityOptions.map((option) => (
                  <option key={option} value={option}>
                    {getNationalityLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:col-span-7">
            <label className="text-sm text-slate-300">
            <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span>Championnat</span>
              {selectedLeagueBadgeUrl && (
                <img
                  src={selectedLeagueBadgeUrl}
                  alt=""
                  className="h-4 w-4 object-contain"
                  loading="lazy"
                />
              )}
            </span>
            <select
              value={selectedLeague}
              onChange={(event) => onSelectLeague(event.target.value)}
              disabled={isLeagueLocked}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="ALL">Tous</option>
              {leagueOptions.map((option) => (
                <option key={option} value={option}>
                  {formatLeagueLabel(option)}
                </option>
              ))}
            </select>
            </label>

            <label className="text-sm text-slate-300">
            <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span>Club</span>
              {selectedClubBadgeUrl && (
                <img
                  src={selectedClubBadgeUrl}
                  alt=""
                  className="h-4 w-4 object-contain"
                  loading="lazy"
                />
              )}
            </span>
            <select
              value={selectedClub}
              onChange={(event) => onSelectClub(event.target.value)}
              disabled={selectedLeague === 'ALL' || clubOptions.length === 0}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="ALL">
                {selectedLeague === 'ALL' ? 'Choisis un championnat' : 'Tous'}
              </option>
              {clubOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            </label>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-14">
          <div className="grid gap-3 md:grid-cols-2 xl:col-span-5">
            <label className="text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
              Age min
            </span>
            <input
              type="number"
              min={0}
              value={minAge}
              onChange={(event) => onMinAgeChange(event.target.value)}
              placeholder="Ex. 21"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
            </label>

            <label className="text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
              Age max
            </span>
            <input
              type="number"
              min={0}
              value={maxAge}
              onChange={(event) => onMaxAgeChange(event.target.value)}
              placeholder="Ex. 30"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:col-span-5">
            <label className="text-sm text-slate-300">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
              Valeur min (M)
              </span>
              <input
                type="number"
                min={0}
              value={minValue}
              onChange={(event) => onMinValueChange(event.target.value)}
              placeholder="Ex. 10"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
            </label>

            <label className="text-sm text-slate-300">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
              Valeur max (M)
              </span>
              <input
                type="number"
                min={0}
              value={maxValue}
              onChange={(event) => onMaxValueChange(event.target.value)}
              placeholder="Ex. 50"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
            </label>
          </div>

          <label className="text-sm text-slate-300 xl:col-span-4">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Tri
          </span>
          <select
            value={sortOption}
            onChange={(event) =>
              onSelectSort(
                event.target.value as
                  | 'rating-desc'
                  | 'value-desc'
                  | 'value-asc'
                  | 'name-asc'
                  | 'name-desc',
              )
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="rating-desc">Note generale</option>
            <option value="value-desc">Valeur decroissante</option>
            <option value="value-asc">Valeur croissante</option>
            <option value="name-asc">Alphabetique A-Z</option>
            <option value="name-desc">Alphabetique Z-A</option>
          </select>
          </label>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-400">
            {formatPlayerCount(totalFilteredPlayers)} • Page {currentPage} sur {totalPages}
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Reinitialiser les filtres
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={currentPage === 1}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Precedent
          </button>
          <button
            type="button"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredPlayers.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            actionLabel={canPick ? 'Drafter ce joueur' : 'Attendre ton tour'}
            onAction={() => onPick(player.id)}
            disabled={!canPick}
          />
        ))}
      </div>
    </section>
  );
}
