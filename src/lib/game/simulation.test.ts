import { describe, expect, it } from 'vitest';
import type { Player, PlayerPosition, PlayerStats } from '../../types/player';
import { getTeamSummary, simulateMatch } from './simulation';

function createPlayer(
  id: number,
  name: string,
  position: PlayerPosition,
  rating: number,
  stats: PlayerStats,
): Player {
  return {
    id,
    name,
    nationality: 'France',
    club: 'Test FC',
    league: 'Test League',
    age: 26,
    position,
    rating,
    value: 50,
    stats,
  };
}

const keeperStats: PlayerStats = {
  pace: 42,
  shooting: 8,
  passing: 58,
  defense: 84,
  physical: 76,
  goalkeeping: 86,
};

const defenderStats: PlayerStats = {
  pace: 66,
  shooting: 35,
  passing: 68,
  defense: 84,
  physical: 82,
};

const creatorMidStats: PlayerStats = {
  pace: 76,
  shooting: 74,
  passing: 87,
  defense: 58,
  physical: 72,
};

const holdingMidStats: PlayerStats = {
  pace: 70,
  shooting: 62,
  passing: 78,
  defense: 82,
  physical: 80,
};

const strikerStats: PlayerStats = {
  pace: 86,
  shooting: 90,
  passing: 70,
  defense: 28,
  physical: 80,
};

const wingerStats: PlayerStats = {
  pace: 88,
  shooting: 78,
  passing: 80,
  defense: 36,
  physical: 68,
};

const balancedUserTeam: Player[] = [
  createPlayer(1, 'Elite Keeper', 'GK', 85, { ...keeperStats, goalkeeping: 88 }),
  createPlayer(2, 'Solid Defender', 'CB', 83, defenderStats),
  createPlayer(3, 'Creative Mid', 'CAM', 84, creatorMidStats),
  createPlayer(4, 'Holding Mid', 'CDM', 82, holdingMidStats),
  createPlayer(5, 'Clinical Striker', 'ST', 86, strikerStats),
];

const balancedAiTeam: Player[] = [
  createPlayer(6, 'Reflex Keeper', 'GK', 84, { ...keeperStats, goalkeeping: 84 }),
  createPlayer(7, 'Mobile Defender', 'RB', 82, { ...defenderStats, pace: 72, defense: 80 }),
  createPlayer(8, 'Playmaker', 'CAM', 83, { ...creatorMidStats, passing: 84, shooting: 72 }),
  createPlayer(9, 'Box To Box', 'CM', 82, { ...holdingMidStats, defense: 74, passing: 80 }),
  createPlayer(10, 'Fast Forward', 'CF', 85, { ...wingerStats, shooting: 84, passing: 82, physical: 72 }),
];

describe('simulation team summary', () => {
  it('reflects profile bonuses for a 5v5 team', () => {
    const creatorTeam: Player[] = [
      createPlayer(11, 'Keeper', 'GK', 84, { ...keeperStats, goalkeeping: 85 }),
      createPlayer(12, 'Center Back', 'CB', 82, defenderStats),
      createPlayer(13, 'Playmaker Mid', 'CAM', 83, creatorMidStats),
      createPlayer(14, 'Wide Threat', 'LW', 82, wingerStats),
      createPlayer(15, 'Finisher', 'ST', 84, strikerStats),
    ];

    const conservativeTeam: Player[] = [
      createPlayer(16, 'Keeper', 'GK', 84, { ...keeperStats, goalkeeping: 85 }),
      createPlayer(17, 'Center Back', 'CB', 82, defenderStats),
      createPlayer(18, 'Anchor Mid', 'CDM', 83, holdingMidStats),
      createPlayer(19, 'Box Mid', 'CM', 82, { ...holdingMidStats, passing: 76, defense: 76 }),
      createPlayer(20, 'Support Forward', 'CF', 84, { ...strikerStats, shooting: 82, passing: 80, pace: 78 }),
    ];

    const creatorSummary = getTeamSummary(creatorTeam);
    const conservativeSummary = getTeamSummary(conservativeTeam);

    expect(creatorSummary.chanceCreation).toBeGreaterThan(conservativeSummary.chanceCreation);
    expect(creatorSummary.transitionThreat).toBeGreaterThan(conservativeSummary.transitionThreat);
    expect(creatorSummary.finishing).toBeGreaterThanOrEqual(conservativeSummary.finishing);
    expect(conservativeSummary.shotPrevention).toBeGreaterThan(creatorSummary.shotPrevention);
    expect(creatorSummary.saveRate).toBeGreaterThan(40);
  });
});

describe('simulateMatch balancing', () => {
  it('produces a plausible distribution of scores across many matches', () => {
    const iterations = 250;
    let zeroZeroCount = 0;
    let totalGoals = 0;
    let scoringMatches = 0;

    for (let index = 0; index < iterations; index += 1) {
      const result = simulateMatch(balancedUserTeam, balancedAiTeam);
      const goals = result.userScore + result.aiScore;

      totalGoals += goals;

      if (goals === 0) {
        zeroZeroCount += 1;
      } else {
        scoringMatches += 1;
      }
    }

    const averageGoals = totalGoals / iterations;

    expect(zeroZeroCount).toBeLessThan(100);
    expect(scoringMatches).toBeGreaterThan(95);
    expect(averageGoals).toBeGreaterThan(0.9);
    expect(averageGoals).toBeLessThan(4.8);
  });
});
