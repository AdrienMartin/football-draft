import type { PlayerRole } from '../../lib/game/draft';
import { formatPlayerCount } from '../../lib/players/formatters';
import type { Player } from '../../types/player';
import { PlayerCard } from '../players/PlayerCard';

type DraftAvailablePlayersProps = {
  players: Player[];
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
  leagueOptions: string[];
  selectedLeague: string;
  onSelectLeague: (value: string) => void;
  sortOption: 'rating-desc' | 'name-asc' | 'name-desc';
  onSelectSort: (value: 'rating-desc' | 'name-asc' | 'name-desc') => void;
  requiredRoles: PlayerRole[];
  maxTeamValue: number | null;
  currentTeamValue: number;
  canPick: boolean;
  onPick: (playerId: number) => void;
};

export function DraftAvailablePlayers({
  players,
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
  leagueOptions,
  selectedLeague,
  onSelectLeague,
  sortOption,
  onSelectSort,
  requiredRoles,
  maxTeamValue,
  currentTeamValue,
  canPick,
  onPick,
}: DraftAvailablePlayersProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Joueurs disponibles</h3>
          <p className="mt-1 text-sm text-slate-400">
            {totalFilteredPlayers} choix valides sur {formatPlayerCount(players.length)}.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-white">Contraintes de draft</p>
          <p className="mt-2">1 GK minimum, puis 2 joueurs maximum par ligne.</p>
          {maxTeamValue !== null && (
            <p className="mt-2">
              Budget : {currentTeamValue} / {maxTeamValue} MEUR
            </p>
          )}
          <p className="mt-2">
            {requiredRoles.length > 0
              ? `Rôles encore obligatoires : ${requiredRoles.join(', ')}`
              : 'Tous les rôles minimums sont déjà couverts.'}
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

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm text-slate-300 xl:col-span-1">
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
                aria-label="Réinitialiser la recherche"
                className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Nationalité
          </span>
          <select
            value={selectedNationality}
            onChange={(event) => onSelectNationality(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">Toutes</option>
            {nationalityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Championnat
          </span>
          <select
            value={selectedLeague}
            onChange={(event) => onSelectLeague(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">Tous</option>
            {leagueOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Tri
          </span>
          <select
            value={sortOption}
            onChange={(event) =>
              onSelectSort(event.target.value as 'rating-desc' | 'name-asc' | 'name-desc')
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="rating-desc">Note générale</option>
            <option value="name-asc">Alphabétique A-Z</option>
            <option value="name-desc">Alphabétique Z-A</option>
          </select>
        </label>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          Page {currentPage} sur {totalPages}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={currentPage === 1}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Précédent
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
