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
  dribbling: 24,
  defense: 84,
  physical: 76,
  goalkeeping: 86,
  reflexes: 87,
  handling: 84,
  distribution: 72,
  aerial: 80,
};

const defenderStats: PlayerStats = {
  pace: 66,
  shooting: 35,
  passing: 68,
  dribbling: 58,
  defense: 84,
  physical: 82,
};

const creatorMidStats: PlayerStats = {
  pace: 76,
  shooting: 74,
  passing: 87,
  dribbling: 85,
  defense: 58,
  physical: 72,
};

const holdingMidStats: PlayerStats = {
  pace: 70,
  shooting: 62,
  passing: 78,
  dribbling: 72,
  defense: 82,
  physical: 80,
};

const strikerStats: PlayerStats = {
  pace: 86,
  shooting: 90,
  passing: 70,
  dribbling: 82,
  defense: 28,
  physical: 80,
};

const wingerStats: PlayerStats = {
  pace: 88,
  shooting: 78,
  passing: 80,
  dribbling: 88,
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

const wideThreatTeam: Player[] = [
  createPlayer(21, 'Wide Keeper', 'GK', 84, { ...keeperStats, goalkeeping: 85 }),
  createPlayer(22, 'Flying Right Back', 'RB', 82, {
    ...defenderStats,
    pace: 82,
    passing: 78,
    dribbling: 72,
  }),
  createPlayer(23, 'Creative Mid', 'CM', 83, {
    ...creatorMidStats,
    passing: 84,
    dribbling: 82,
  }),
  createPlayer(24, 'Explosive Winger', 'LW', 84, {
    ...wingerStats,
    pace: 92,
    dribbling: 92,
    passing: 84,
  }),
  createPlayer(25, 'Box Striker', 'ST', 84, strikerStats),
];

const centralThreatTeam: Player[] = [
  createPlayer(26, 'Central Keeper', 'GK', 84, { ...keeperStats, goalkeeping: 85 }),
  createPlayer(27, 'Center Back', 'CB', 82, defenderStats),
  createPlayer(28, 'Elite Creator', 'CAM', 85, {
    ...creatorMidStats,
    passing: 91,
    dribbling: 87,
    shooting: 78,
  }),
  createPlayer(29, 'Support Forward', 'CF', 84, {
    ...strikerStats,
    shooting: 86,
    passing: 84,
    dribbling: 84,
  }),
  createPlayer(30, 'Penalty Box Striker', 'ST', 85, {
    ...strikerStats,
    shooting: 93,
    dribbling: 80,
    pace: 82,
  }),
];

function getRoleForPlayerName(team: Player[], playerName: string) {
  return team.find((player) => player.name === playerName)?.position;
}

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
    const iterations = 180;
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

    expect(zeroZeroCount).toBeLessThan(90);
    expect(scoringMatches).toBeGreaterThan(70);
    expect(averageGoals).toBeGreaterThan(1.1);
    expect(averageGoals).toBeLessThan(6.2);
  });

  it('keeps match stats consistent with the generated event log', () => {
    const result = simulateMatch(balancedUserTeam, balancedAiTeam);
    const userGoalEvents = result.events.filter(
      (event) => event.team === 'user' && event.type === 'goal',
    );
    const aiGoalEvents = result.events.filter(
      (event) => event.team === 'ai' && event.type === 'goal',
    );
    const userShotEvents = result.events.filter(
      (event) =>
        event.team === 'user' &&
        (event.type === 'shot' ||
          event.type === 'save' ||
          event.type === 'goal' ||
          event.type === 'block'),
    );
    const aiShotEvents = result.events.filter(
      (event) =>
        event.team === 'ai' &&
        (event.type === 'shot' ||
          event.type === 'save' ||
          event.type === 'goal' ||
          event.type === 'block'),
    );

    expect(result.events).toEqual([...result.events].sort((a, b) => a.minute - b.minute));

    expect(result.userScore).toBe(userGoalEvents.length);
    expect(result.aiScore).toBe(aiGoalEvents.length);

    expect(result.userStats.shots).toBe(userShotEvents.length);
    expect(result.aiStats.shots).toBe(aiShotEvents.length);

    expect(result.userStats.shotsOnTarget).toBe(
      userShotEvents.filter((event) => event.type === 'save' || event.type === 'goal').length,
    );
    expect(result.aiStats.shotsOnTarget).toBe(
      aiShotEvents.filter((event) => event.type === 'save' || event.type === 'goal').length,
    );

    expect(result.userStats.shots).toBeGreaterThanOrEqual(result.userStats.shotsOnTarget);
    expect(result.aiStats.shots).toBeGreaterThanOrEqual(result.aiStats.shotsOnTarget);

    expect(result.userStats.possession + result.aiStats.possession).toBe(100);
    expect(result.userStats.xg).toBeGreaterThanOrEqual(0);
    expect(result.aiStats.xg).toBeGreaterThanOrEqual(0);

    userGoalEvents.forEach((event) => {
      expect(event.scorer).toBeTruthy();
      expect(event.userScore).toBeGreaterThan(0);
    });

    aiGoalEvents.forEach((event) => {
      expect(event.scorer).toBeTruthy();
      expect(event.aiScore).toBeGreaterThan(0);
    });
  });

  it('keeps scorer and assister invariants coherent', () => {
    const iterations = 60;

    for (let index = 0; index < iterations; index += 1) {
      const result = simulateMatch(balancedUserTeam, balancedAiTeam);

      result.events.forEach((event) => {
        if (event.type === 'goal') {
          expect(event.scorer).toBeTruthy();
          expect(event.scorer).not.toBe(event.assister);
        }

        if (event.type === 'save' || event.type === 'shot' || event.type === 'block') {
          expect(event.xg).toBeGreaterThan(0);
        }
      });
    }
  });

  it('reflects wide and central profiles in action selection over many matches', () => {
    const iterations = 70;
    let wideCrossEvents = 0;
    let centralChanceEvents = 0;

    for (let index = 0; index < iterations; index += 1) {
      const wideResult = simulateMatch(wideThreatTeam, balancedAiTeam);
      const centralResult = simulateMatch(centralThreatTeam, balancedAiTeam);

      wideCrossEvents += wideResult.events.filter(
        (event) => event.team === 'user' && event.type === 'cross',
      ).length;
      centralChanceEvents += centralResult.events.filter(
        (event) => event.team === 'user' && event.type === 'chance',
      ).length;
    }

    expect(wideCrossEvents).toBeGreaterThan(20);
    expect(centralChanceEvents).toBeGreaterThan(35);
  });

  it('keeps scorers and assisters concentrated on plausible roles over many matches', () => {
    const iterations = 120;
    let defenderGoals = 0;
    let goalkeeperGoals = 0;
    let midfielderAssists = 0;
    let forwardAssists = 0;
    let totalGoals = 0;

    for (let index = 0; index < iterations; index += 1) {
      const result = simulateMatch(balancedUserTeam, balancedAiTeam);

      result.events
        .filter((event) => event.team === 'user' && event.type === 'goal')
        .forEach((event) => {
          totalGoals += 1;

          const scorerRole = getRoleForPlayerName(balancedUserTeam, event.scorer ?? '');
          const assisterRole = getRoleForPlayerName(balancedUserTeam, event.assister ?? '');

          if (scorerRole === 'CB' || scorerRole === 'RB' || scorerRole === 'LB') {
            defenderGoals += 1;
          }

          if (scorerRole === 'GK') {
            goalkeeperGoals += 1;
          }

          if (assisterRole === 'CAM' || assisterRole === 'CM' || assisterRole === 'CDM') {
            midfielderAssists += 1;
          }

          if (assisterRole === 'ST' || assisterRole === 'CF' || assisterRole === 'LW' || assisterRole === 'RW') {
            forwardAssists += 1;
          }
        });
    }

    expect(totalGoals).toBeGreaterThan(0);
    expect(goalkeeperGoals).toBe(0);
    expect(defenderGoals).toBeLessThanOrEqual(Math.max(2, Math.round(totalGoals * 0.12)));
    expect(midfielderAssists + forwardAssists).toBeGreaterThan(0);
    expect(midfielderAssists).toBeGreaterThanOrEqual(forwardAssists * 0.4);
  });
});
