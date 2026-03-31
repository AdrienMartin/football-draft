import { describe, expect, it } from 'vitest';
import type { Player, PlayerPosition, PlayerStats } from '../../types/player';
import { getAiPick } from './draft';

function createPlayer(
  id: number,
  name: string,
  position: PlayerPosition,
  rating: number,
  value: number,
  stats: PlayerStats,
): Player {
  return {
    id,
    name,
    nationality: 'France',
    club: 'Test FC',
    league: 'Test League',
    age: 25,
    position,
    rating,
    value,
    stats,
  };
}

const keeperStats: PlayerStats = {
  pace: 40,
  shooting: 8,
  passing: 56,
  dribbling: 20,
  defense: 82,
  physical: 74,
  vision: 50,
  composure: 66,
  tackling: 18,
  positioning: 72,
  crossing: 10,
  goalkeeping: 85,
  reflexes: 84,
  handling: 82,
  distribution: 68,
  aerial: 78,
  shotStopping: 86,
  commandOfArea: 80,
};

const strikerStats: PlayerStats = {
  pace: 84,
  shooting: 91,
  passing: 70,
  dribbling: 82,
  defense: 24,
  physical: 78,
  vision: 72,
  composure: 86,
  tackling: 20,
  positioning: 88,
  crossing: 38,
};

describe('getAiPick', () => {
  it('avoids taking a goalkeeper too early when stronger outfield stars are available without budget', () => {
    const team: Player[] = [];
    const players: Player[] = [
      createPlayer(1, 'Elite Goalkeeper', 'GK', 87, 20, keeperStats),
      createPlayer(2, 'Elite Striker', 'ST', 87, 60, strikerStats),
      createPlayer(3, 'Elite Winger', 'RW', 86, 55, {
        pace: 88,
        shooting: 84,
        passing: 80,
        dribbling: 90,
        defense: 28,
        physical: 72,
      }),
    ];

    const pick = getAiPick(team, players, null);

    expect(pick?.position).not.toBe('GK');
    expect(['Elite Striker', 'Elite Winger']).toContain(pick?.name);
  });

  it('prefers a clearly stronger player when there is no budget constraint', () => {
    const team: Player[] = [
      createPlayer(1, 'Goalkeeper', 'GK', 82, 18, keeperStats),
    ];
    const players: Player[] = [
      createPlayer(2, 'Elite Striker', 'ST', 87, 60, strikerStats),
      createPlayer(3, 'Cheap Forward', 'ST', 71, 8, {
        ...strikerStats,
        shooting: 72,
        pace: 76,
        dribbling: 70,
      }),
    ];

    const pick = getAiPick(team, players, null);

    expect(pick?.name).toBe('Elite Striker');
  });

  it('still respects budget pressure when a max team value exists', () => {
    const team: Player[] = [
      createPlayer(1, 'Goalkeeper', 'GK', 82, 18, keeperStats),
      createPlayer(2, 'Defender', 'CB', 80, 18, {
        pace: 64,
        shooting: 30,
        passing: 66,
        dribbling: 54,
        defense: 84,
        physical: 82,
      }),
      createPlayer(3, 'Midfielder', 'CM', 81, 18, {
        pace: 74,
        shooting: 72,
        passing: 82,
        dribbling: 80,
        defense: 68,
        physical: 74,
      }),
    ];
    const players: Player[] = [
      createPlayer(4, 'Too Expensive Star', 'ST', 88, 50, strikerStats),
      createPlayer(5, 'Affordable Striker', 'ST', 80, 12, {
        ...strikerStats,
        shooting: 84,
        pace: 80,
        dribbling: 78,
      }),
    ];

    const pick = getAiPick(team, players, 70);

    expect(pick?.name).toBe('Affordable Striker');
  });
});
