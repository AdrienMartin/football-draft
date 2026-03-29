import { getPlayerRole } from './draft';
import {
  buildChanceText,
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
  type: 'goal' | 'chance' | 'save' | 'pressure' | 'shot';
  scorer?: string;
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

function getTopScorers(players: Player[]) {
  const scorerPool = players
    .map((player) => ({
      name: player.name,
      weight: getScorerWeight(player),
    }))
    .filter((player) => player.weight > 0);
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
    },
    aiStats: {
      possession: aiPossession,
      shots: aiShotEvents.length,
      shotsOnTarget: aiShotEvents.filter(
        (event) => event.type === 'save' || event.type === 'goal',
      ).length,
      xg: roundXg(aiShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
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

  const chanceQuality =
    (attackingTeam.summary.finishing * 0.34 +
      attackingTeam.summary.chanceCreation * 0.38 +
      attackingTeam.summary.transitionThreat * 0.16 +
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

  maybeAddEvent(events, {
    minute,
    team: attackingTeam.label,
    type: 'chance',
    text: buildChanceText(attackingTeam.label, chanceQuality, minute),
    userScore: score.user,
    aiScore: score.ai,
  });

  const shotOnTargetProbability = clamp((chanceQuality - 24) / 32, 0.48, 0.95);
  const shotXg = roundXg(clamp((chanceQuality - 18) / 65, 0.04, 0.62));

  if (Math.random() > shotOnTargetProbability) {
    maybeAddEvent(events, {
      minute: minute + 1,
      team: attackingTeam.label,
      type: 'shot',
      xg: shotXg,
      text: buildShotText(attackingTeam.label, shotXg),
      userScore: score.user,
      aiScore: score.ai,
    });
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
    maybeAddEvent(events, {
      minute: minute + 1,
      team: defendingTeam.label,
      type: 'save',
      xg: shotXg,
      text: buildSaveText(attackingTeam.label, shotXg),
      userScore: score.user,
      aiScore: score.ai,
    });
    return;
  }

  const scorer = sample(attackingTeam.scorers) ?? 'Un attaquant';

  if (attackingTeam.label === 'user') {
    score.user += 1;
  } else {
    score.ai += 1;
  }

  maybeAddEvent(events, {
    minute: minute + 1,
    team: attackingTeam.label,
    type: 'goal',
    scorer,
    xg: shotXg,
    text: buildGoalText(attackingTeam.label, scorer, minute + 1, shotXg),
    userScore: score.user,
    aiScore: score.ai,
  });
}

export function simulateMatch(userTeam: Player[], aiTeam: Player[]): MatchResult {
  const userSummary = getTeamSummary(userTeam);
  const aiSummary = getTeamSummary(aiTeam);
  const userContext: TeamContext = {
    label: 'user',
    summary: userSummary,
    scorers: getTopScorers(userTeam),
  };
  const aiContext: TeamContext = {
    label: 'ai',
    summary: aiSummary,
    scorers: getTopScorers(aiTeam),
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
