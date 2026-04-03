import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getEligiblePlayers } from '../src/lib/game/draft';
import { simulateMatch, type MatchResult } from '../src/lib/game/simulation';
import type { Player } from '../src/types/player';

type CalibrationOptions = {
  iterations: number;
  poolSize: number | null;
  minRating: number | null;
};

type CalibrationAggregate = {
  zeroZeroCount: number;
  scoringMatches: number;
  totalGoals: number;
  totalShots: number;
  totalShotsOnTarget: number;
  totalXg: number;
  scorelines: Map<string, number>;
};

const DEFAULT_ITERATIONS = 500;

function parseIntegerFlag(flag: string) {
  const raw = process.argv.find((argument) => argument.startsWith(`${flag}=`));
  if (!raw) {
    return null;
  }

  const value = Number.parseInt(raw.slice(flag.length + 1), 10);
  return Number.isFinite(value) ? value : null;
}

function parseOptions(): CalibrationOptions {
  const iterations = parseIntegerFlag('--iterations') ?? DEFAULT_ITERATIONS;
  const poolSize = parseIntegerFlag('--pool-size');
  const minRating = parseIntegerFlag('--min-rating');

  return {
    iterations: Math.max(1, iterations),
    poolSize: poolSize === null ? null : Math.max(10, poolSize),
    minRating: minRating === null ? null : Math.max(1, minRating),
  };
}

function sample<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function loadPlayers() {
  const playersPath = resolve(process.cwd(), 'public/data/players.json');
  const raw = readFileSync(playersPath, 'utf8');
  return JSON.parse(raw) as Player[];
}

function buildCalibrationPool(players: Player[], options: CalibrationOptions) {
  let pool = [...players].sort((left, right) => {
    if (right.rating !== left.rating) {
      return right.rating - left.rating;
    }

    return right.value - left.value;
  });

  if (options.minRating !== null) {
    pool = pool.filter((player) => player.rating >= options.minRating!);
  }

  if (options.poolSize !== null) {
    pool = pool.slice(0, options.poolSize);
  }

  return pool;
}

function buildRandomValidTeam(pool: Player[]) {
  const team: Player[] = [];
  const remainingIds = new Set(pool.map((player) => player.id));

  while (team.length < 5) {
    const candidates = pool.filter((player) => remainingIds.has(player.id));
    const eligible = getEligiblePlayers(team, candidates, null);

    if (eligible.length === 0) {
      throw new Error('Impossible de construire une equipe valide avec le pool courant.');
    }

    const picked = sample(eligible);
    if (!picked) {
      throw new Error('Aucun joueur eligible tire au sort.');
    }

    team.push(picked);
    remainingIds.delete(picked.id);
  }

  return team;
}

function buildRandomMatchup(pool: Player[]) {
  const userTeam = buildRandomValidTeam(pool);
  const usedIds = new Set(userTeam.map((player) => player.id));
  const remainingPool = pool.filter((player) => !usedIds.has(player.id));
  const aiTeam = buildRandomValidTeam(remainingPool);

  return { userTeam, aiTeam };
}

function createAggregate(): CalibrationAggregate {
  return {
    zeroZeroCount: 0,
    scoringMatches: 0,
    totalGoals: 0,
    totalShots: 0,
    totalShotsOnTarget: 0,
    totalXg: 0,
    scorelines: new Map<string, number>(),
  };
}

function recordMatch(aggregate: CalibrationAggregate, result: MatchResult) {
  const totalGoals = result.userScore + result.aiScore;
  const totalShots = result.userStats.shots + result.aiStats.shots;
  const totalShotsOnTarget = result.userStats.shotsOnTarget + result.aiStats.shotsOnTarget;
  const totalXg = result.userStats.xg + result.aiStats.xg;
  const scoreline = `${result.userScore}-${result.aiScore}`;

  aggregate.totalGoals += totalGoals;
  aggregate.totalShots += totalShots;
  aggregate.totalShotsOnTarget += totalShotsOnTarget;
  aggregate.totalXg += totalXg;

  if (totalGoals === 0) {
    aggregate.zeroZeroCount += 1;
  } else {
    aggregate.scoringMatches += 1;
  }

  aggregate.scorelines.set(scoreline, (aggregate.scorelines.get(scoreline) ?? 0) + 1);
}

function average(total: number, iterations: number) {
  return Math.round((total / iterations) * 100) / 100;
}

function formatScorelines(scorelines: Map<string, number>, iterations: number) {
  return [...scorelines.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([scoreline, count]) => `${scoreline} (${count}, ${Math.round((count / iterations) * 1000) / 10}%)`);
}

function main() {
  const options = parseOptions();
  const players = loadPlayers();
  const pool = buildCalibrationPool(players, options);

  if (pool.length < 10) {
    throw new Error('Le pool de calibration contient moins de 10 joueurs. Elargis les filtres.');
  }

  const aggregate = createAggregate();

  for (let index = 0; index < options.iterations; index += 1) {
    const matchup = buildRandomMatchup(pool);
    const result = simulateMatch(matchup.userTeam, matchup.aiTeam);
    recordMatch(aggregate, result);
  }

  const summary = {
    iterations: options.iterations,
    poolSize: pool.length,
    minRating: options.minRating,
    averageGoals: average(aggregate.totalGoals, options.iterations),
    averageShots: average(aggregate.totalShots, options.iterations),
    averageShotsOnTarget: average(aggregate.totalShotsOnTarget, options.iterations),
    averageXg: average(aggregate.totalXg, options.iterations),
    zeroZeroRate: Math.round((aggregate.zeroZeroCount / options.iterations) * 1000) / 10,
    scoringMatchRate: Math.round((aggregate.scoringMatches / options.iterations) * 1000) / 10,
    topScorelines: formatScorelines(aggregate.scorelines, options.iterations),
  };

  console.log('\nCalibration moteur de match\n');
  console.table({
    iterations: summary.iterations,
    poolSize: summary.poolSize,
    minRating: summary.minRating ?? 'aucun',
    averageGoals: summary.averageGoals,
    averageShots: summary.averageShots,
    averageShotsOnTarget: summary.averageShotsOnTarget,
    averageXg: summary.averageXg,
    zeroZeroRate: `${summary.zeroZeroRate}%`,
    scoringMatchRate: `${summary.scoringMatchRate}%`,
  });

  console.log('Scores les plus frequents:');
  summary.topScorelines.forEach((scoreline) => {
    console.log(`- ${scoreline}`);
  });
}

main();
