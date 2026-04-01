import { getPlayerRole, type PlayerRole } from './draft';
import type { Player } from '../../types/player';

export type DraftSortOption =
  | 'rating-desc'
  | 'value-desc'
  | 'value-asc'
  | 'name-asc'
  | 'name-desc';

export type DraftFilterState = {
  selectedRole: 'ALL' | PlayerRole;
  searchQuery: string;
  selectedNationality: string;
  selectedLeague: string;
  selectedClub: string;
  minAge: string;
  maxAge: string;
  minValue: string;
  maxValue: string;
  sortOption: DraftSortOption;
};

function parseOptionalNumber(value: string) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

export function filterAndSortDraftPlayers(
  players: Player[],
  filters: DraftFilterState,
): Player[] {
  const parsedMinAge = parseOptionalNumber(filters.minAge);
  const parsedMaxAge = parseOptionalNumber(filters.maxAge);
  const parsedMinValue = parseOptionalNumber(filters.minValue);
  const parsedMaxValue = parseOptionalNumber(filters.maxValue);
  const normalizedSearch = filters.searchQuery.trim().toLowerCase();

  return players
    .filter((player) =>
      filters.selectedRole === 'ALL'
        ? true
        : getPlayerRole(player.position) === filters.selectedRole,
    )
    .filter((player) =>
      filters.selectedNationality === 'ALL'
        ? true
        : player.nationality === filters.selectedNationality,
    )
    .filter((player) =>
      filters.selectedLeague === 'ALL' ? true : player.league === filters.selectedLeague,
    )
    .filter((player) =>
      filters.selectedClub === 'ALL' ? true : player.club === filters.selectedClub,
    )
    .filter((player) => (parsedMinAge === null ? true : player.age >= parsedMinAge))
    .filter((player) => (parsedMaxAge === null ? true : player.age <= parsedMaxAge))
    .filter((player) => (parsedMinValue === null ? true : player.value >= parsedMinValue))
    .filter((player) => (parsedMaxValue === null ? true : player.value <= parsedMaxValue))
    .filter((player) =>
      normalizedSearch.length === 0 ? true : player.name.toLowerCase().includes(normalizedSearch),
    )
    .sort((left, right) => {
      if (filters.sortOption === 'value-desc') {
        if (right.value !== left.value) {
          return right.value - left.value;
        }

        return right.rating !== left.rating
          ? right.rating - left.rating
          : left.name.localeCompare(right.name);
      }

      if (filters.sortOption === 'value-asc') {
        if (left.value !== right.value) {
          return left.value - right.value;
        }

        return right.rating !== left.rating
          ? right.rating - left.rating
          : left.name.localeCompare(right.name);
      }

      if (filters.sortOption === 'name-asc') {
        return left.name.localeCompare(right.name);
      }

      if (filters.sortOption === 'name-desc') {
        return right.name.localeCompare(left.name);
      }

      if (right.rating !== left.rating) {
        return right.rating - left.rating;
      }

      return left.name.localeCompare(right.name);
    });
}
