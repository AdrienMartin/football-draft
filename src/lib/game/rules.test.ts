import { describe, expect, it } from 'vitest';
import type { Player, PlayerPosition, PlayerStats } from '../../types/player';
import { applyDraftRules, canAddPlayerWithinBudget } from './rules';

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
  nationality: string,
  league: string,
  value: number,
): Player {
  return {
    id,
    name,
    nationality,
    club: `${name} FC`,
    league,
    age: 25,
    position,
    rating: 75,
    value,
    stats: defaultStats,
  };
}

describe('draft rules filtering', () => {
  it('applies league and nationality rules together', () => {
    const players = [
      createPlayer(1, 'Blue One', 'ST', 'France', 'Premier League', 18),
      createPlayer(2, 'Blue Two', 'CM', 'France', 'Ligue 1', 16),
      createPlayer(3, 'Blue Three', 'CB', 'Brazil', 'Premier League', 20),
      createPlayer(4, 'Blue Four', 'GK', 'France', 'Premier League', 14),
    ];

    const filtered = applyDraftRules(players, {
      league: 'Premier League',
      nationality: 'France',
      maxTeamValue: null,
    });

    expect(filtered.map((player) => player.name)).toEqual(['Blue One', 'Blue Four']);
  });

  it('checks whether a player still fits under the budget cap', () => {
    const team = [
      createPlayer(1, 'One', 'GK', 'France', 'Ligue 1', 20),
      createPlayer(2, 'Two', 'CB', 'France', 'Ligue 1', 18),
    ];

    expect(
      canAddPlayerWithinBudget(team, createPlayer(3, 'Fits', 'ST', 'France', 'Ligue 1', 12), 55),
    ).toBe(true);
    expect(
      canAddPlayerWithinBudget(
        team,
        createPlayer(4, 'Too Much', 'ST', 'France', 'Ligue 1', 20),
        55,
      ),
    ).toBe(false);
  });
});
