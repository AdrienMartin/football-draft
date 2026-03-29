import { getPlayerRole } from './draft';
import {
  buildBlockText,
  buildChanceText,
  buildCounterText,
  buildCrossText,
  buildGoalText,
  buildHighlights,
  buildPressureText,
  buildSaveText,
  buildShotText,
} from './matchCommentary';
import type { Player } from '../../types/player';

export type MatchSideSummary = {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
  goalkeeping: number;
  chanceCreation: number;
  finishing: number;
  transitionThreat: number;
  shotPrevention: number;
  saveRate: number;
};

export type MatchEvent = {
  minute: number;
  team: 'user' | 'ai';
  type: 'goal' | 'chance' | 'save' | 'pressure' | 'shot' | 'counter' | 'cross' | 'block';
  scorer?: string;
  assister?: string;
  xg?: number;
  userScore: number;
  aiScore: number;
  text: string;
};

export type MatchSideStats = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChances: number;
  saves: number;
  blocks: number;
  dangerousAttacks: number;
};

export type MatchResult = {
  userScore: number;
  aiScore: number;
  winner: 'user' | 'ai' | 'draw';
  userSummary: MatchSideSummary;
  aiSummary: MatchSideSummary;
  userStats: MatchSideStats;
  aiStats: MatchSideStats;
  highlights: string[];
  events: MatchEvent[];
};

type TeamContext = {
  label: 'user' | 'ai';
  summary: MatchSideSummary;
  scorers: string[];
  creators: string[];
  centralScorers: string[];
  transitionScorers: string[];
  wideScorers: string[];
  centralCreators: string[];
  wideCreators: string[];
  transitionCreators: string[];
  centralBias: number;
  wideBias: number;
  transitionBias: number;
};

const MATCH_SEGMENTS = [4, 9, 14, 20, 26, 33, 40, 48, 56, 64, 72, 79, 85, 89];

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sample<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function getScorerWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.shooting * 1 +
    player.stats.dribbling * 0.2 +
    player.stats.pace * 0.2 +
    player.rating * 0.2;

  if (role === 'FWD') {
    return baseWeight * 1.25;
  }

  if (role === 'MID') {
    return baseWeight * 0.8;
  }

  if (role === 'DEF') {
    return baseWeight * 0.28;
  }

  return 0;
}

function getCreatorWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.passing * 0.8 +
    player.stats.dribbling * 0.45 +
    player.stats.pace * 0.1 +
    player.rating * 0.18;

  if (role === 'MID') {
    return baseWeight * 1.22;
  }

  if (role === 'FWD') {
    return baseWeight * 0.92;
  }

  if (role === 'DEF') {
    return baseWeight * 0.45;
  }

  return baseWeight * 0.2;
}

function getPlayersSortedByWeight(players: Player[], getWeight: (player: Player) => number) {
  return [...players]
    .map((player) => ({
      name: player.name,
      weight: getWeight(player),
    }))
    .filter((player) => player.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((player) => player.name);
}

function getWeightedStrength(players: Player[], getWeight: (player: Player) => number) {
  return players.reduce((total, player) => total + getWeight(player), 0);
}

function getCentralScorerWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.shooting * 1.02 +
    player.stats.dribbling * 0.16 +
    player.stats.passing * 0.08 +
    player.rating * 0.18;

  if (player.position === 'ST' || player.position === 'CF') {
    return baseWeight * 1.28;
  }

  if (player.position === 'CAM') {
    return baseWeight * 0.92;
  }

  if (role === 'MID') {
    return baseWeight * 0.72;
  }

  if (role === 'DEF') {
    return baseWeight * 0.24;
  }

  return baseWeight;
}

function getWideScorerWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.shooting * 0.82 +
    player.stats.dribbling * 0.32 +
    player.stats.pace * 0.24 +
    player.rating * 0.14;

  if (player.position === 'LW' || player.position === 'RW') {
    return baseWeight * 1.3;
  }

  if (player.position === 'ST' || player.position === 'CF') {
    return baseWeight * 1.05;
  }

  if (role === 'DEF') {
    return baseWeight * 0.42;
  }

  if (role === 'MID') {
    return baseWeight * 0.88;
  }

  return baseWeight;
}

function getTransitionScorerWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.pace * 0.42 +
    player.stats.dribbling * 0.28 +
    player.stats.shooting * 0.26 +
    player.rating * 0.12;

  if (player.position === 'LW' || player.position === 'RW') {
    return baseWeight * 1.26;
  }

  if (player.position === 'ST' || player.position === 'CF') {
    return baseWeight * 1.14;
  }

  if (role === 'MID') {
    return baseWeight * 0.82;
  }

  if (role === 'DEF') {
    return baseWeight * 0.18;
  }

  return baseWeight;
}

function getCentralCreatorWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.passing * 0.86 +
    player.stats.dribbling * 0.26 +
    player.stats.shooting * 0.06 +
    player.rating * 0.16;

  if (player.position === 'CAM' || player.position === 'CM' || player.position === 'CF') {
    return baseWeight * 1.24;
  }

  if (role === 'MID') {
    return baseWeight * 1.08;
  }

  return baseWeight;
}

function getWideCreatorWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.passing * 0.48 +
    player.stats.dribbling * 0.34 +
    player.stats.pace * 0.18 +
    player.rating * 0.14;

  if (player.position === 'LW' || player.position === 'RW' || player.position === 'RB') {
    return baseWeight * 1.26;
  }

  if (role === 'MID') {
    return baseWeight * 1.02;
  }

  return baseWeight;
}

function getTransitionCreatorWeight(player: Player) {
  const role = getPlayerRole(player.position);
  const baseWeight =
    player.stats.pace * 0.36 +
    player.stats.dribbling * 0.34 +
    player.stats.passing * 0.22 +
    player.rating * 0.12;

  if (player.position === 'LW' || player.position === 'RW' || player.position === 'RB') {
    return baseWeight * 1.28;
  }

  if (role === 'MID') {
    return baseWeight * 1.04;
  }

  return baseWeight;
}

function getTopScorers(players: Player[]) {
  const scorerPool = getPlayersSortedByWeight(players, getScorerWeight).map((name, index) => ({
    name,
    weight: scorerPoolWeight(index),
  }));
  const fallbackPool =
    scorerPool.length > 0
      ? scorerPool
      : players.map((player) => ({
          name: player.name,
          weight: player.rating,
        }));

  return [...fallbackPool]
    .sort((a, b) => b.weight - a.weight)
    .map((player) => player.name);
}

function scorerPoolWeight(index: number) {
  return Math.max(1, 100 - index * 8);
}

function getTopCreators(players: Player[]) {
  return getPlayersSortedByWeight(players, getCreatorWeight);
}

function getTeamAttackBias(players: Player[]) {
  const centralBias =
    getWeightedStrength(players, getCentralScorerWeight) * 0.54 +
    getWeightedStrength(players, getCentralCreatorWeight) * 0.46;
  const wideBias =
    getWeightedStrength(players, getWideScorerWeight) * 0.48 +
    getWeightedStrength(players, getWideCreatorWeight) * 0.52;
  const transitionBias =
    getWeightedStrength(players, getTransitionScorerWeight) * 0.52 +
    getWeightedStrength(players, getTransitionCreatorWeight) * 0.48;

  return { centralBias, wideBias, transitionBias };
}

function getGoalkeeperStrength(players: Player[]) {
  const goalkeeper = players.find((player) => getPlayerRole(player.position) === 'GK');

  if (!goalkeeper) {
    return 50;
  }

  return Math.round(
    goalkeeper.stats.goalkeeping ??
      goalkeeper.stats.defense * 0.65 +
        (goalkeeper.stats.reflexes ?? 0) * 0.15 +
        (goalkeeper.stats.handling ?? 0) * 0.1 +
        goalkeeper.stats.passing * 0.15 +
        goalkeeper.stats.physical * 0.1 +
        goalkeeper.rating * 0.1,
  );
}

function getPlayersByRole(players: Player[]) {
  return {
    attackers: players.filter((player) => getPlayerRole(player.position) === 'FWD'),
    midfielders: players.filter((player) => getPlayerRole(player.position) === 'MID'),
    defenders: players.filter((player) => getPlayerRole(player.position) === 'DEF'),
    goalkeeper: players.find((player) => getPlayerRole(player.position) === 'GK'),
  };
}

function getAttackerProfileBonus(players: Player[]) {
  return players.reduce(
    (bonus, player) => {
      if (player.position === 'ST') {
        bonus.finishing += 6;
      } else if (player.position === 'CF') {
        bonus.finishing += 3;
        bonus.creation += 4;
      } else if (player.position === 'LW' || player.position === 'RW') {
        bonus.transition += 5;
        bonus.creation += 2;
      }

      return bonus;
    },
    { finishing: 0, creation: 0, transition: 0 },
  );
}

function getMidfieldProfileBonus(players: Player[]) {
  return players.reduce(
    (bonus, player) => {
      if (player.position === 'CAM') {
        bonus.creation += 6;
      } else if (player.position === 'CDM') {
        bonus.protection += 6;
      } else if (player.position === 'CM') {
        bonus.creation += 2;
        bonus.protection += 2;
      }

      return bonus;
    },
    { creation: 0, protection: 0 },
  );
}

function getDefenseProfileBonus(players: Player[]) {
  return players.reduce(
    (bonus, player) => {
      if (player.position === 'CB') {
        bonus.prevention += 5;
      } else if (player.position === 'RB' || player.position === 'LB') {
        bonus.transition += 4;
        bonus.prevention += 2;
      }

      return bonus;
    },
    { prevention: 0, transition: 0 },
  );
}

export function getTeamSummary(players: Player[]): MatchSideSummary {
  const { attackers, midfielders, defenders, goalkeeper } = getPlayersByRole(players);
  const overall = Math.round(average(players.map((player) => player.rating)));
  const attackerBonus = getAttackerProfileBonus(attackers);
  const midfieldBonus = getMidfieldProfileBonus(midfielders);
  const defenseBonus = getDefenseProfileBonus(defenders);
  const goalkeeperSaveRate = Math.round(
    goalkeeper
      ? (goalkeeper.stats.goalkeeping ?? 50) * 0.42 +
          (goalkeeper.stats.reflexes ?? goalkeeper.stats.goalkeeping ?? 50) * 0.24 +
          (goalkeeper.stats.handling ?? goalkeeper.stats.goalkeeping ?? 50) * 0.16 +
          (goalkeeper.stats.aerial ?? goalkeeper.stats.physical) * 0.08 +
          goalkeeper.stats.defense * 0.1
      : 50,
  );
  const attack = Math.round(
    average(
      attackers.map(
        (player) =>
          player.stats.shooting * 0.52 +
          player.stats.dribbling * 0.16 +
          player.stats.pace * 0.28 +
          player.stats.passing * 0.04,
      ),
    ),
  );
  const midfield = Math.round(
    average(
      midfielders.map(
        (player) =>
          player.stats.passing * 0.42 +
          player.stats.dribbling * 0.14 +
          player.stats.defense * 0.18 +
          player.stats.shooting * 0.14 +
          player.stats.physical * 0.12,
      ),
    ),
  );
  const defense = Math.round(
    average(
      defenders.map(
        (player) =>
          player.stats.defense * 0.55 +
          player.stats.dribbling * 0.05 +
          player.stats.physical * 0.25 +
          player.stats.passing * 0.15,
      ),
    ),
  );

  return {
    attack,
    midfield,
    defense,
    overall,
    goalkeeping: getGoalkeeperStrength(players),
    chanceCreation: Math.round(
      midfield * 0.58 +
        attack * 0.2 +
        attackerBonus.creation +
        midfieldBonus.creation +
        defenseBonus.transition * 0.35,
    ),
    finishing: Math.round(attack * 0.72 + attackerBonus.finishing + midfield * 0.08),
    transitionThreat: Math.round(
      attack * 0.28 + midfield * 0.2 + attackerBonus.transition + defenseBonus.transition,
    ),
    shotPrevention: Math.round(
      defense * 0.72 + midfield * 0.14 + midfieldBonus.protection + defenseBonus.prevention,
    ),
    saveRate: clamp(goalkeeperSaveRate, 45, 99),
  };
}

function buildPressureEvent(
  minute: number,
  team: 'user' | 'ai',
  text: string,
  userScore: number,
  aiScore: number,
): MatchEvent {
  return {
    minute,
    team,
    type: 'pressure',
    text,
    userScore,
    aiScore,
  };
}

function pickAssister(team: TeamContext, scorer?: string) {
  const candidates = team.creators.filter((name) => name !== scorer);

  if (candidates.length === 0) {
    return undefined;
  }

  return sample(candidates.slice(0, 3));
}

function pickScorer(team: TeamContext, attackMode: 'wide' | 'central' | 'transition') {
  const candidates =
    attackMode === 'wide'
      ? team.wideScorers
      : attackMode === 'transition'
        ? team.transitionScorers
        : team.centralScorers;

  return sample(candidates.slice(0, 4)) ?? sample(team.scorers.slice(0, 4)) ?? 'Un attaquant';
}

function pickModeAssister(
  team: TeamContext,
  attackMode: 'wide' | 'central' | 'transition',
  scorer?: string,
) {
  const candidates =
    attackMode === 'wide'
      ? team.wideCreators
      : attackMode === 'transition'
        ? team.transitionCreators
        : team.centralCreators;
  const filtered = candidates.filter((name) => name !== scorer);

  if (filtered.length === 0) {
    return pickAssister(team, scorer);
  }

  return sample(filtered.slice(0, 3));
}

function buildLiveEvent(
  minute: number,
  team: 'user' | 'ai',
  type: MatchEvent['type'],
  text: string,
  score: { user: number; ai: number },
  extras?: Partial<MatchEvent>,
): MatchEvent {
  return {
    minute,
    team,
    type,
    text,
    userScore: score.user,
    aiScore: score.ai,
    ...extras,
  };
}

function maybeAddEvent(events: MatchEvent[], event: MatchEvent | null) {
  if (event) {
    events.push(event);
  }
}

function roundXg(value: number) {
  return Math.round(value * 100) / 100;
}

function buildMatchStats(
  userSummary: MatchSideSummary,
  aiSummary: MatchSideSummary,
  events: MatchEvent[],
) {
  const userPressure = events.filter(
    (event) => event.team === 'user' && event.type === 'pressure',
  ).length;
  const aiPressure = events.filter(
    (event) => event.team === 'ai' && event.type === 'pressure',
  ).length;

  const rawUserPossession =
    50 +
    (userSummary.midfield - aiSummary.midfield) * 0.7 +
    (userSummary.chanceCreation - aiSummary.chanceCreation) * 0.08 +
    (userPressure - aiPressure) * 1.8;
  const userPossession = Math.round(clamp(rawUserPossession, 35, 65));
  const aiPossession = 100 - userPossession;

  const userShotEvents = events.filter(
    (event) =>
      event.team === 'user' &&
      (event.type === 'shot' || event.type === 'save' || event.type === 'goal'),
  );
  const aiShotEvents = events.filter(
    (event) =>
      event.team === 'ai' &&
      (event.type === 'shot' || event.type === 'save' || event.type === 'goal'),
  );

  return {
    userStats: {
      possession: userPossession,
      shots: userShotEvents.length,
      shotsOnTarget: userShotEvents.filter(
        (event) => event.type === 'save' || event.type === 'goal',
      ).length,
      xg: roundXg(userShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
      bigChances: events.filter(
        (event) => event.team === 'user' && event.type === 'chance' && (event.xg ?? 0) >= 0.28,
      ).length,
      saves: events.filter((event) => event.team === 'user' && event.type === 'save').length,
      blocks: events.filter((event) => event.team === 'user' && event.type === 'block').length,
      dangerousAttacks: events.filter(
        (event) =>
          event.team === 'user' &&
          (event.type === 'chance' || event.type === 'counter' || event.type === 'cross'),
      ).length,
    },
    aiStats: {
      possession: aiPossession,
      shots: aiShotEvents.length,
      shotsOnTarget: aiShotEvents.filter(
        (event) => event.type === 'save' || event.type === 'goal',
      ).length,
      xg: roundXg(aiShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
      bigChances: events.filter(
        (event) => event.team === 'ai' && event.type === 'chance' && (event.xg ?? 0) >= 0.28,
      ).length,
      saves: events.filter((event) => event.team === 'ai' && event.type === 'save').length,
      blocks: events.filter((event) => event.team === 'ai' && event.type === 'block').length,
      dangerousAttacks: events.filter(
        (event) =>
          event.team === 'ai' &&
          (event.type === 'chance' || event.type === 'counter' || event.type === 'cross'),
      ).length,
    },
  };
}

function simulateSegment(
  minute: number,
  attackingTeam: TeamContext,
  defendingTeam: TeamContext,
  score: { user: number; ai: number },
  events: MatchEvent[],
) {
  const attackingBias = score[attackingTeam.label] < score[defendingTeam.label] ? 3 : 0;
  const defendingBias = score[defendingTeam.label] > score[attackingTeam.label] ? 2 : 0;
  const fatigueFactor = minute > 70 ? 0.96 : minute > 45 ? 0.98 : 1;
  const centralThreat =
    attackingTeam.summary.chanceCreation -
    defendingTeam.summary.midfield * 0.35 +
    attackingTeam.centralBias * 0.015;
  const wideThreat =
    attackingTeam.summary.transitionThreat -
    defendingTeam.summary.defense * 0.22 +
    attackingTeam.wideBias * 0.016;
  const transitionThreat =
    attackingTeam.summary.transitionThreat -
    defendingTeam.summary.midfield * 0.18 +
    attackingTeam.transitionBias * 0.018;
  const attackModePool = [
    ...Array.from({
      length: Math.max(1, Math.round(clamp(centralThreat / 18, 1, 5))),
    }).map(() => 'central' as const),
    ...Array.from({
      length: Math.max(1, Math.round(clamp(wideThreat / 18, 1, 5))),
    }).map(() => 'wide' as const),
    ...Array.from({
      length: Math.max(1, Math.round(clamp(transitionThreat / 18, 1, 5))),
    }).map(() => 'transition' as const),
  ];
  const attackMode = sample(attackModePool) ?? 'central';

  const possessionEdge =
    attackingTeam.summary.midfield -
    defendingTeam.summary.midfield +
    attackingBias -
    defendingBias;
  const possessionRoll = possessionEdge + randomBetween(-6, 6);

  if (possessionRoll > 3) {
    maybeAddEvent(
      events,
      buildPressureEvent(
        minute,
        attackingTeam.label,
        buildPressureText(
          minute,
          attackingTeam.label,
          score[attackingTeam.label],
          score[defendingTeam.label],
        ),
        score.user,
        score.ai,
      ),
    );
  }

  if (attackMode === 'transition') {
    maybeAddEvent(
      events,
      buildLiveEvent(
        minute,
        attackingTeam.label,
        'counter',
        buildCounterText(attackingTeam.label, minute),
        score,
      ),
    );
  } else if (attackMode === 'wide' && Math.random() < 0.64) {
    maybeAddEvent(
      events,
      buildLiveEvent(
        minute,
        attackingTeam.label,
        'cross',
        buildCrossText(attackingTeam.label),
        score,
      ),
    );
  }

  const chanceQuality =
    (attackingTeam.summary.finishing * 0.34 +
      attackingTeam.summary.chanceCreation * 0.38 +
      attackingTeam.summary.transitionThreat * 0.16 +
      (attackMode === 'transition' ? 4.5 : 0) +
      (attackMode === 'wide' ? 2.5 : 0) +
      randomBetween(10, 24) -
      defendingTeam.summary.shotPrevention * 0.15 -
      defendingTeam.summary.saveRate * 0.025) *
    fatigueFactor;

  const chanceProbability = clamp(
    0.43 +
      (attackingTeam.summary.chanceCreation - defendingTeam.summary.midfield) / 110 +
      (attackingTeam.summary.transitionThreat - defendingTeam.summary.defense) / 155,
    0.32,
    0.84,
  );

  if (Math.random() > chanceProbability) {
    return;
  }

  maybeAddEvent(
    events,
    buildLiveEvent(
      minute,
      attackingTeam.label,
      'chance',
      buildChanceText(attackingTeam.label, chanceQuality, minute),
      score,
      {
        xg: roundXg(clamp((chanceQuality - 18) / 65, 0.04, 0.62)),
      },
    ),
  );

  const shotOnTargetProbability = clamp((chanceQuality - 24) / 32, 0.48, 0.95);
  const shotXg = roundXg(clamp((chanceQuality - 18) / 65, 0.04, 0.62));

  if (Math.random() < clamp((defendingTeam.summary.shotPrevention - attackingTeam.summary.finishing) / 180 + 0.08, 0.05, 0.24)) {
    maybeAddEvent(
      events,
      buildLiveEvent(
        minute + 1,
        defendingTeam.label,
        'block',
        buildBlockText(attackingTeam.label),
        score,
        { xg: roundXg(shotXg * 0.65) },
      ),
    );
    return;
  }

  if (Math.random() > shotOnTargetProbability) {
    maybeAddEvent(
      events,
      buildLiveEvent(minute + 1, attackingTeam.label, 'shot', buildShotText(attackingTeam.label, shotXg), score, {
        xg: shotXg,
      }),
    );
    return;
  }

  const goalProbability = clamp(
    0.31 +
      (attackingTeam.summary.finishing - defendingTeam.summary.shotPrevention) / 130 +
      (chanceQuality - defendingTeam.summary.saveRate) / 76,
    0.2,
    0.78,
  );

  if (Math.random() > goalProbability) {
    maybeAddEvent(
      events,
      buildLiveEvent(minute + 1, defendingTeam.label, 'save', buildSaveText(attackingTeam.label, shotXg), score, {
        xg: shotXg,
      }),
    );
    return;
  }

  const scorer = pickScorer(attackingTeam, attackMode);
  const assister = pickModeAssister(attackingTeam, attackMode, scorer);

  if (attackingTeam.label === 'user') {
    score.user += 1;
  } else {
    score.ai += 1;
  }

  maybeAddEvent(
    events,
    buildLiveEvent(
      minute + 1,
      attackingTeam.label,
      'goal',
      buildGoalText(attackingTeam.label, scorer, minute + 1, shotXg, assister),
      score,
      {
        scorer,
        assister,
        xg: shotXg,
      },
    ),
  );
}

export function simulateMatch(userTeam: Player[], aiTeam: Player[]): MatchResult {
  const userSummary = getTeamSummary(userTeam);
  const aiSummary = getTeamSummary(aiTeam);
  const userContext: TeamContext = {
    label: 'user',
    summary: userSummary,
    scorers: getTopScorers(userTeam),
    creators: getTopCreators(userTeam),
    centralScorers: getPlayersSortedByWeight(userTeam, getCentralScorerWeight),
    transitionScorers: getPlayersSortedByWeight(userTeam, getTransitionScorerWeight),
    wideScorers: getPlayersSortedByWeight(userTeam, getWideScorerWeight),
    centralCreators: getPlayersSortedByWeight(userTeam, getCentralCreatorWeight),
    wideCreators: getPlayersSortedByWeight(userTeam, getWideCreatorWeight),
    transitionCreators: getPlayersSortedByWeight(userTeam, getTransitionCreatorWeight),
    ...getTeamAttackBias(userTeam),
  };
  const aiContext: TeamContext = {
    label: 'ai',
    summary: aiSummary,
    scorers: getTopScorers(aiTeam),
    creators: getTopCreators(aiTeam),
    centralScorers: getPlayersSortedByWeight(aiTeam, getCentralScorerWeight),
    transitionScorers: getPlayersSortedByWeight(aiTeam, getTransitionScorerWeight),
    wideScorers: getPlayersSortedByWeight(aiTeam, getWideScorerWeight),
    centralCreators: getPlayersSortedByWeight(aiTeam, getCentralCreatorWeight),
    wideCreators: getPlayersSortedByWeight(aiTeam, getWideCreatorWeight),
    transitionCreators: getPlayersSortedByWeight(aiTeam, getTransitionCreatorWeight),
    ...getTeamAttackBias(aiTeam),
  };
  const events: MatchEvent[] = [];
  const score = { user: 0, ai: 0 };

  MATCH_SEGMENTS.forEach((minute) => {
    const userMomentum =
      userSummary.midfield * 0.48 +
      userSummary.attack * 0.28 +
      (score.user < score.ai ? 4 : 0) +
      randomBetween(-6, 9);
    const aiMomentum =
      aiSummary.midfield * 0.48 +
      aiSummary.attack * 0.28 +
      (score.ai < score.user ? 4 : 0) +
      randomBetween(-6, 9);

    if (userMomentum >= aiMomentum) {
      simulateSegment(minute, userContext, aiContext, score, events);
    } else {
      simulateSegment(minute, aiContext, userContext, score, events);
    }

    if (Math.abs(userMomentum - aiMomentum) > 4) {
      const dominant = userMomentum > aiMomentum ? userContext : aiContext;
      const defending = dominant.label === 'user' ? aiContext : userContext;
      simulateSegment(minute + 2, dominant, defending, score, events);
    }
  });

  const orderedEvents = [...events].sort((a, b) => a.minute - b.minute);
  const { userStats, aiStats } = buildMatchStats(userSummary, aiSummary, orderedEvents);

  return {
    userScore: score.user,
    aiScore: score.ai,
    winner: score.user === score.ai ? 'draw' : score.user > score.ai ? 'user' : 'ai',
    userSummary,
    aiSummary,
    userStats,
    aiStats,
    highlights: buildHighlights(userSummary, aiSummary, score.user, score.ai, orderedEvents),
    events: orderedEvents,
  };
}
