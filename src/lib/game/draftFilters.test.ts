import { describe, expect, it } from 'vitest';
import type { Player, PlayerPosition, PlayerStats } from '../../types/player';
import {
  filterAndSortDraftPlayers,
  type DraftFilterState,
} from './draftFilters';

const defaultStats: PlayerStats = {
  pace: 70,
  shooting: 70,
  passing: 70,
  dribbling: 70,
  defense: 70,
  physical: 70,
  vision: 70,
  composure: 70,
  tackling: 70,
  positioning: 70,
  crossing: 70,
};

function createPlayer(
  id: number,
  name: string,
  position: PlayerPosition,
  age: number,
  value: number,
  rating: number,
  nationality: string,
  league: string,
  club: string,
): Player {
  return {
    id,
    name,
    nationality,
    club,
    league,
    age,
    position,
    rating,
    value,
    stats: defaultStats,
  };
}

function createFilters(overrides: Partial<DraftFilterState> = {}): DraftFilterState {
  return {
    selectedRole: 'ALL',
    searchQuery: '',
    selectedNationality: 'ALL',
    selectedLeague: 'ALL',
    selectedClub: 'ALL',
    minAge: '',
    maxAge: '',
    minValue: '',
    maxValue: '',
    sortOption: 'rating-desc',
    ...overrides,
  };
}

const players: Player[] = [
  createPlayer(1, 'Alex Martin', 'ST', 19, 12, 74, 'France', 'Ligue 1', 'Lille'),
  createPlayer(2, 'Bruno Silva', 'CM', 24, 28, 79, 'Portugal', 'Serie A', 'Milan'),
  createPlayer(3, 'Carlos Vega', 'CB', 31, 8, 72, 'Spain', 'LaLiga', 'Sevilla'),
  createPlayer(4, 'Diego Costa', 'RW', 27, 45, 82, 'Brazil', 'Premier League', 'Arsenal'),
];

describe('filterAndSortDraftPlayers', () => {
  it('filters by age range', () => {
    const results = filterAndSortDraftPlayers(
      players,
      createFilters({ minAge: '20', maxAge: '28' }),
    );

    expect(results.map((player) => player.name)).toEqual(['Diego Costa', 'Bruno Silva']);
  });

  it('filters by value range', () => {
    const results = filterAndSortDraftPlayers(
      players,
      createFilters({ minValue: '10', maxValue: '30' }),
    );

    expect(results.map((player) => player.name)).toEqual(['Bruno Silva', 'Alex Martin']);
  });

  it('combines league and club filters', () => {
    const results = filterAndSortDraftPlayers(
      players,
      createFilters({ selectedLeague: 'Serie A', selectedClub: 'Milan' }),
    );

    expect(results.map((player) => player.name)).toEqual(['Bruno Silva']);
  });

  it('combines search with other filters', () => {
    const results = filterAndSortDraftPlayers(
      players,
      createFilters({
        selectedNationality: 'Brazil',
        searchQuery: 'diego',
      }),
    );

    expect(results.map((player) => player.name)).toEqual(['Diego Costa']);
  });

  it('sorts by value descending', () => {
    const results = filterAndSortDraftPlayers(
      players,
      createFilters({ sortOption: 'value-desc' }),
    );

    expect(results.map((player) => player.name)).toEqual([
      'Diego Costa',
      'Bruno Silva',
      'Alex Martin',
      'Carlos Vega',
    ]);
  });

  it('sorts by value ascending', () => {
    const results = filterAndSortDraftPlayers(
      players,
      createFilters({ sortOption: 'value-asc' }),
    );

    expect(results.map((player) => player.name)).toEqual([
      'Carlos Vega',
      'Alex Martin',
      'Bruno Silva',
      'Diego Costa',
    ]);
  });
});
