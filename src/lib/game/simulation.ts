import type { Player } from '../../types/player';
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

type MatchTeam = 'user' | 'ai';
type AttackMode = 'central' | 'wide' | 'transition';

type WeightedName = {
  name: string;
  weight: number;
};

type TeamContext = {
  label: MatchTeam;
  summary: MatchSideSummary;
  buildUp: number;
  midfieldControl: number;
  pressing: number;
  widePlay: number;
  centralPlay: number;
  scorers: WeightedName[];
  creators: WeightedName[];
  centralScorers: WeightedName[];
  wideScorers: WeightedName[];
  transitionScorers: WeightedName[];
  centralCreators: WeightedName[];
  wideCreators: WeightedName[];
  transitionCreators: WeightedName[];
  builders: WeightedName[];
  midfieldBallCarriers: WeightedName[];
  wideBallCarriers: WeightedName[];
};

type ScoreState = {
  user: number;
  ai: number;
};

type SequenceState = {
  attackingTeam: TeamContext;
  defendingTeam: TeamContext;
  minute: number;
  attackMode: AttackMode;
  score: ScoreState;
  events: MatchEvent[];
  xg: number;
};

const MATCH_SEGMENTS = [2, 4, 6, 8, 11, 14, 17, 20, 24, 28, 32, 36, 40, 45, 49, 53, 57, 61, 66, 71, 76, 81, 85, 88, 90];

function average(values: number[]) {
  if (values.length === 0) {
    return 50;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function roundXg(value: number) {
  return Math.round(value * 100) / 100;
}

function isCountedShotEvent(event: MatchEvent) {
  return event.type === 'shot' || event.type === 'save' || event.type === 'goal' || event.type === 'block';
}

function sample<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function getGoalkeeperScore(player?: Player) {
  if (!player) {
    return 50;
  }

  return clamp(
    Math.round(
      (player.stats.goalkeeping ?? 50) * 0.48 +
        (player.stats.reflexes ?? player.stats.goalkeeping ?? 50) * 0.22 +
        (player.stats.handling ?? player.stats.goalkeeping ?? 50) * 0.16 +
        (player.stats.aerial ?? player.stats.physical) * 0.08 +
        (player.stats.distribution ?? player.stats.passing) * 0.06,
    ),
    40,
    99,
  );
}

function getRoleWeightMultiplier(position: Player['position']) {
  if (position === 'ST') {
    return { build: 0.25, midfield: 0.55, wide: 0.65 };
  }

  if (position === 'CF') {
    return { build: 0.4, midfield: 0.95, wide: 0.9 };
  }

  if (position === 'CAM') {
    return { build: 0.6, midfield: 1.1, wide: 0.82 };
  }

  if (position === 'CM' || position === 'CDM') {
    return { build: 1.05, midfield: 1.08, wide: 0.72 };
  }

  if (position === 'CB') {
    return { build: 1.15, midfield: 0.45, wide: 0.22 };
  }

  if (position === 'RB' || position === 'LB') {
    return { build: 1.02, midfield: 0.84, wide: 1.12 };
  }

  if (position === 'LW' || position === 'RW') {
    return { build: 0.42, midfield: 0.86, wide: 1.2 };
  }

  return { build: 0.4, midfield: 0.5, wide: 0.4 };
}

function getWeightedPlayers(players: Player[], getWeight: (player: Player) => number) {
  return players
    .map((player) => ({
      name: player.name,
      weight: Math.max(0.1, getWeight(player)),
    }))
    .sort((left, right) => right.weight - left.weight);
}

function pickWeightedName(pool: WeightedName[], excluded?: string) {
  const candidates = pool.filter((entry) => entry.name !== excluded);

  if (candidates.length === 0) {
    return pool[0]?.name;
  }

  const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.name;
    }
  }

  return candidates[0]?.name;
}

function buildLiveEvent(
  minute: number,
  team: MatchTeam,
  type: MatchEvent['type'],
  text: string,
  score: ScoreState,
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

function addEvent(events: MatchEvent[], event: MatchEvent | null) {
  if (event) {
    events.push(event);
  }
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
        bonus.central += 5;
      } else if (player.position === 'CF') {
        bonus.finishing += 3;
        bonus.creation += 4;
        bonus.central += 4;
      } else if (player.position === 'LW' || player.position === 'RW') {
        bonus.transition += 6;
        bonus.wide += 7;
      }

      return bonus;
    },
    { finishing: 0, creation: 0, transition: 0, central: 0, wide: 0 },
  );
}

function getMidfieldProfileBonus(players: Player[]) {
  return players.reduce(
    (bonus, player) => {
      if (player.position === 'CAM') {
        bonus.creation += 6;
        bonus.central += 5;
      } else if (player.position === 'CDM') {
        bonus.protection += 6;
        bonus.build += 3;
      } else if (player.position === 'CM') {
        bonus.creation += 2;
        bonus.protection += 2;
        bonus.build += 2;
      }

      return bonus;
    },
    { creation: 0, protection: 0, build: 0, central: 0 },
  );
}

function getDefenseProfileBonus(players: Player[]) {
  return players.reduce(
    (bonus, player) => {
      if (player.position === 'CB') {
        bonus.prevention += 5;
        bonus.build += 1;
      } else if (player.position === 'RB' || player.position === 'LB') {
        bonus.transition += 4;
        bonus.prevention += 2;
        bonus.wide += 4;
        bonus.build += 2;
      }

      return bonus;
    },
    { prevention: 0, transition: 0, wide: 0, build: 0 },
  );
}

export function getTeamSummary(players: Player[]): MatchSideSummary {
  const { attackers, midfielders, defenders, goalkeeper } = getPlayersByRole(players);
  const overall = Math.round(average(players.map((player) => player.rating)));
  const attackerBonus = getAttackerProfileBonus(attackers);
  const midfieldBonus = getMidfieldProfileBonus(midfielders);
  const defenseBonus = getDefenseProfileBonus(defenders);
  const attack = Math.round(
    average(
      attackers.map(
        (player) =>
          player.stats.shooting * 0.48 +
          player.stats.dribbling * 0.22 +
          player.stats.pace * 0.2 +
          player.stats.passing * 0.1,
      ),
    ),
  );
  const midfield = Math.round(
    average(
      midfielders.map(
        (player) =>
          player.stats.passing * 0.38 +
          player.stats.dribbling * 0.18 +
          player.stats.defense * 0.16 +
          player.stats.shooting * 0.1 +
          player.stats.physical * 0.18,
      ),
    ),
  );
  const defense = Math.round(
    average(
      defenders.map(
        (player) =>
          player.stats.defense * 0.5 +
          player.stats.physical * 0.24 +
          player.stats.passing * 0.16 +
          player.stats.pace * 0.1,
      ),
    ),
  );

  const goalkeeping = getGoalkeeperScore(goalkeeper);

  return {
    attack,
    midfield,
    defense,
    overall,
    goalkeeping,
    chanceCreation: Math.round(
      midfield * 0.5 +
        attack * 0.18 +
        attackerBonus.creation +
        midfieldBonus.creation +
        defenseBonus.wide * 0.25,
    ),
    finishing: Math.round(attack * 0.74 + midfield * 0.06 + attackerBonus.finishing),
    transitionThreat: Math.round(
      attack * 0.24 + midfield * 0.14 + attackerBonus.transition + defenseBonus.transition,
    ),
    shotPrevention: Math.round(
      defense * 0.68 + midfield * 0.16 + midfieldBonus.protection + defenseBonus.prevention,
    ),
    saveRate: clamp(goalkeeping, 40, 99),
  };
}

function buildTeamContext(label: MatchTeam, players: Player[]): TeamContext {
  const summary = getTeamSummary(players);
  const { attackers, midfielders, defenders } = getPlayersByRole(players);
  const attackerBonus = getAttackerProfileBonus(attackers);
  const midfieldBonus = getMidfieldProfileBonus(midfielders);
  const defenseBonus = getDefenseProfileBonus(defenders);

  const scorerWeight = (player: Player) => {
    const role = getPlayerRole(player.position);
    const base =
      player.stats.shooting * 1 +
      player.stats.dribbling * 0.25 +
      player.stats.pace * 0.18 +
      player.rating * 0.18;

    if (role === 'FWD') {
      return base * 1.2;
    }

    if (role === 'MID') {
      return base * 0.72;
    }

    if (role === 'DEF') {
      return base * 0.22;
    }

    return 0;
  };

  const creatorWeight = (player: Player) => {
    const role = getPlayerRole(player.position);
    const base =
      player.stats.passing * 0.82 +
      player.stats.dribbling * 0.32 +
      player.stats.pace * 0.08 +
      player.rating * 0.18;

    if (role === 'MID') {
      return base * 1.18;
    }

    if (role === 'FWD') {
      return base * 0.9;
    }

    if (role === 'DEF') {
      return base * 0.48;
    }

    return base * 0.2;
  };

  const centralScorerWeight = (player: Player) => {
    const base = scorerWeight(player);

    if (player.position === 'ST' || player.position === 'CF') {
      return base * 1.24;
    }

    if (player.position === 'CAM') {
      return base * 0.94;
    }

    return base;
  };

  const wideScorerWeight = (player: Player) => {
    const base = scorerWeight(player);

    if (player.position === 'LW' || player.position === 'RW') {
      return base * 1.28;
    }

    if (player.position === 'RB' || player.position === 'LB') {
      return base * 0.55;
    }

    return base;
  };

  const transitionScorerWeight = (player: Player) => {
    const base = scorerWeight(player);

    if (player.position === 'LW' || player.position === 'RW') {
      return base * 1.24;
    }

    if (player.position === 'ST' || player.position === 'CF') {
      return base * 1.1;
    }

    return base;
  };

  const centralCreatorWeight = (player: Player) => {
    const base = creatorWeight(player);

    if (player.position === 'CAM' || player.position === 'CM' || player.position === 'CF') {
      return base * 1.22;
    }

    return base;
  };

  const wideCreatorWeight = (player: Player) => {
    const base = creatorWeight(player);

    if (
      player.position === 'LW' ||
      player.position === 'RW' ||
      player.position === 'RB' ||
      player.position === 'LB'
    ) {
      return base * 1.24;
    }

    return base;
  };

  const transitionCreatorWeight = (player: Player) => {
    const base = creatorWeight(player);

    if (player.position === 'LW' || player.position === 'RW') {
      return base * 1.24;
    }

    if (player.position === 'RB' || player.position === 'LB') {
      return base * 1.16;
    }

    return base;
  };

  const builderWeight = (player: Player) => {
    const multiplier = getRoleWeightMultiplier(player.position);

    return (
      (player.stats.passing * 0.54 +
        player.stats.dribbling * 0.16 +
        player.stats.defense * 0.12 +
        player.stats.physical * 0.08 +
        player.rating * 0.1) *
      multiplier.build
    );
  };

  const midfieldBallCarrierWeight = (player: Player) => {
    const multiplier = getRoleWeightMultiplier(player.position);

    return (
      (player.stats.passing * 0.38 +
        player.stats.dribbling * 0.26 +
        player.stats.physical * 0.12 +
        player.stats.pace * 0.12 +
        player.rating * 0.12) *
      multiplier.midfield
    );
  };

  const wideBallCarrierWeight = (player: Player) => {
    const multiplier = getRoleWeightMultiplier(player.position);

    return (
      (player.stats.dribbling * 0.36 +
        player.stats.pace * 0.24 +
        player.stats.passing * 0.2 +
        player.stats.physical * 0.06 +
        player.rating * 0.14) *
      multiplier.wide
    );
  };

  return {
    label,
    summary,
    buildUp: Math.round(
      summary.defense * 0.46 +
        summary.midfield * 0.34 +
        defenseBonus.build +
        midfieldBonus.build +
        summary.goalkeeping * 0.08,
    ),
    midfieldControl: Math.round(summary.midfield * 0.72 + summary.attack * 0.08),
    pressing: Math.round(summary.midfield * 0.44 + summary.shotPrevention * 0.4 + summary.attack * 0.08),
    widePlay: Math.round(summary.transitionThreat * 0.6 + defenseBonus.wide + attackerBonus.wide),
    centralPlay: Math.round(summary.chanceCreation * 0.62 + attackerBonus.central + midfieldBonus.central),
    scorers: getWeightedPlayers(players, scorerWeight),
    creators: getWeightedPlayers(players, creatorWeight),
    centralScorers: getWeightedPlayers(players, centralScorerWeight),
    wideScorers: getWeightedPlayers(players, wideScorerWeight),
    transitionScorers: getWeightedPlayers(players, transitionScorerWeight),
    centralCreators: getWeightedPlayers(players, centralCreatorWeight),
    wideCreators: getWeightedPlayers(players, wideCreatorWeight),
    transitionCreators: getWeightedPlayers(players, transitionCreatorWeight),
    builders: getWeightedPlayers(players, builderWeight),
    midfieldBallCarriers: getWeightedPlayers(players, midfieldBallCarrierWeight),
    wideBallCarriers: getWeightedPlayers(players, wideBallCarrierWeight),
  };
}

function getActionMode(attackingTeam: TeamContext, defendingTeam: TeamContext) {
  const centralWeight = clamp(
    2 + Math.round((attackingTeam.centralPlay - defendingTeam.summary.midfield * 0.35) / 12),
    1,
    6,
  );
  const wideWeight = clamp(
    2 + Math.round((attackingTeam.widePlay - defendingTeam.summary.defense * 0.2) / 12),
    1,
    6,
  );
  const transitionWeight = clamp(
    2 +
      Math.round(
        (attackingTeam.summary.transitionThreat - defendingTeam.summary.midfield * 0.14) / 12,
      ),
    1,
    6,
  );
  const pool = [
    ...Array.from({ length: centralWeight }).map(() => 'central' as const),
    ...Array.from({ length: wideWeight }).map(() => 'wide' as const),
    ...Array.from({ length: transitionWeight }).map(() => 'transition' as const),
  ];

  return sample(pool) ?? 'central';
}

function getMinuteFatigueModifier(minute: number) {
  if (minute >= 80) {
    return 0.93;
  }

  if (minute >= 65) {
    return 0.96;
  }

  if (minute >= 50) {
    return 0.98;
  }

  return 1;
}

function resolveBuildPhase(state: SequenceState) {
  const builder = pickWeightedName(state.attackingTeam.builders);
  const attackValue =
    state.attackingTeam.buildUp * 0.72 +
    state.attackingTeam.summary.chanceCreation * 0.14 +
    randomBetween(-6, 8);
  const defenseValue =
    state.defendingTeam.pressing * 0.72 +
    state.defendingTeam.summary.midfield * 0.16 +
    randomBetween(-6, 7);
  const successChance = clamp(0.64 + (attackValue - defenseValue) / 155, 0.42, 0.92);

  if (Math.random() < clamp(successChance * 0.5, 0.16, 0.42)) {
    addEvent(
      state.events,
      buildLiveEvent(
        state.minute,
        state.attackingTeam.label,
        'pressure',
        buildPressureText(
          state.minute,
          state.attackingTeam.label,
          state.score[state.attackingTeam.label],
          state.score[state.defendingTeam.label],
        ),
        state.score,
        { assister: builder },
      ),
    );
  }

  return Math.random() < successChance ? 'midfield' : null;
}

function resolveMidfieldPhase(state: SequenceState) {
  const carrier =
    state.attackMode === 'wide'
      ? pickWeightedName(state.attackingTeam.wideBallCarriers)
      : pickWeightedName(state.attackingTeam.midfieldBallCarriers);
  const attackValue =
    state.attackingTeam.midfieldControl * 0.62 +
    state.attackingTeam.summary.chanceCreation * 0.18 +
    (state.attackMode === 'transition' ? state.attackingTeam.summary.transitionThreat * 0.12 : 0) +
    randomBetween(-8, 10);
  const defenseValue =
    state.defendingTeam.midfieldControl * 0.48 +
    state.defendingTeam.pressing * 0.24 +
    randomBetween(-8, 9);
  const successChance = clamp(0.61 + (attackValue - defenseValue) / 150, 0.4, 0.9);

  if (state.attackMode === 'transition' && Math.random() < 0.62) {
    addEvent(
      state.events,
      buildLiveEvent(
        state.minute,
        state.attackingTeam.label,
        'counter',
        buildCounterText(state.attackingTeam.label, state.minute),
        state.score,
        { assister: carrier },
      ),
    );
  }

  return Math.random() < successChance ? 'finalThird' : null;
}

function resolveFinalThirdPhase(state: SequenceState) {
  const actionCreator =
    state.attackMode === 'wide'
      ? pickWeightedName(state.attackingTeam.wideCreators)
      : state.attackMode === 'transition'
        ? pickWeightedName(state.attackingTeam.transitionCreators)
        : pickWeightedName(state.attackingTeam.centralCreators);
  const widthBonus = state.attackMode === 'wide' ? state.attackingTeam.widePlay * 0.08 : 0;
  const transitionBonus =
    state.attackMode === 'transition' ? state.attackingTeam.summary.transitionThreat * 0.1 : 0;
  const attackValue =
    state.attackingTeam.summary.chanceCreation * 0.5 +
    state.attackingTeam.summary.finishing * 0.14 +
    widthBonus +
    transitionBonus +
    randomBetween(-8, 11);
  const defenseValue =
    state.defendingTeam.summary.shotPrevention * 0.58 +
    state.defendingTeam.summary.midfield * 0.1 +
    randomBetween(-8, 8);
  const successChance = clamp(0.6 + (attackValue - defenseValue) / 150, 0.38, 0.9);

  if (state.attackMode === 'wide' && Math.random() < 0.62) {
    addEvent(
      state.events,
      buildLiveEvent(
        state.minute,
        state.attackingTeam.label,
        'cross',
        buildCrossText(state.attackingTeam.label),
        state.score,
        { assister: actionCreator },
      ),
    );
  }

  if (Math.random() > successChance) {
    if (Math.random() < 0.22) {
      addEvent(
        state.events,
        buildLiveEvent(
          state.minute,
          state.defendingTeam.label,
          'block',
          buildBlockText(state.attackingTeam.label),
          state.score,
          { xg: 0.03, assister: actionCreator },
        ),
      );
    }

    if (Math.random() < 0.48) {
      const speculativeXg = roundXg(
        state.attackMode === 'wide'
          ? randomBetween(0.05, 0.12)
          : state.attackMode === 'transition'
            ? randomBetween(0.08, 0.16)
            : randomBetween(0.06, 0.14),
      );

      addEvent(
        state.events,
        buildLiveEvent(
          state.minute + 1,
          state.attackingTeam.label,
          'shot',
          buildShotText(state.attackingTeam.label, speculativeXg),
          state.score,
          {
            xg: speculativeXg,
            scorer:
              (state.attackMode === 'wide'
                ? pickWeightedName(state.attackingTeam.wideScorers)
                : state.attackMode === 'transition'
                  ? pickWeightedName(state.attackingTeam.transitionScorers)
                  : pickWeightedName(state.attackingTeam.centralScorers)) ??
              pickWeightedName(state.attackingTeam.scorers),
            assister: actionCreator,
          },
        ),
      );
    }

    return null;
  }

  return 'box';
}

function resolveBoxPhase(state: SequenceState) {
  const actionCreator =
    state.attackMode === 'wide'
      ? pickWeightedName(state.attackingTeam.wideCreators)
      : state.attackMode === 'transition'
        ? pickWeightedName(state.attackingTeam.transitionCreators)
        : pickWeightedName(state.attackingTeam.centralCreators);
  const fatigueModifier = getMinuteFatigueModifier(state.minute);
  const chanceQuality = clamp(
    (state.attackingTeam.summary.chanceCreation * 0.38 +
      state.attackingTeam.summary.finishing * 0.36 +
      (state.attackMode === 'transition' ? 6 : 0) +
      (state.attackMode === 'wide' ? 4 : 0) -
      state.defendingTeam.summary.shotPrevention * 0.18 -
      state.defendingTeam.summary.saveRate * 0.06 +
      randomBetween(22, 34)) *
      fatigueModifier,
    30,
    99,
  );

  const shotXg = roundXg(
    state.attackMode === 'transition'
      ? clamp((chanceQuality - 18) / 50, 0.14, 0.54)
      : state.attackMode === 'wide'
        ? clamp((chanceQuality - 20) / 54, 0.1, 0.4)
        : clamp((chanceQuality - 19) / 52, 0.12, 0.48),
  );
  state.xg += shotXg;

  addEvent(
    state.events,
    buildLiveEvent(
      state.minute,
      state.attackingTeam.label,
      'chance',
      buildChanceText(state.attackingTeam.label, chanceQuality, state.minute),
      state.score,
      { xg: shotXg, assister: actionCreator },
    ),
  );

  const blockChance = clamp(
    0.06 + (state.defendingTeam.summary.shotPrevention - state.attackingTeam.summary.finishing) / 190,
    0.04,
    0.18,
  );
  if (Math.random() < blockChance) {
    addEvent(
      state.events,
      buildLiveEvent(
        state.minute + 1,
        state.attackingTeam.label,
        'block',
        buildBlockText(state.attackingTeam.label),
        state.score,
        { xg: roundXg(shotXg * 0.72), assister: actionCreator },
      ),
    );
    return;
  }

  const onTargetChance = clamp(0.62 + (chanceQuality - 44) / 72, 0.46, 0.94);
  if (Math.random() > onTargetChance) {
    addEvent(
      state.events,
      buildLiveEvent(
        state.minute + 1,
        state.attackingTeam.label,
        'shot',
        buildShotText(state.attackingTeam.label, shotXg),
        state.score,
        {
          xg: shotXg,
          scorer:
            (state.attackMode === 'wide'
              ? pickWeightedName(state.attackingTeam.wideScorers)
              : state.attackMode === 'transition'
                ? pickWeightedName(state.attackingTeam.transitionScorers)
                : pickWeightedName(state.attackingTeam.centralScorers)) ??
            pickWeightedName(state.attackingTeam.scorers),
          assister: actionCreator,
        },
      ),
    );
    return;
  }

  const goalChance = clamp(
    0.36 +
      (state.attackingTeam.summary.finishing - state.defendingTeam.summary.shotPrevention) / 120 +
      (chanceQuality - state.defendingTeam.summary.saveRate) / 90,
    0.2,
    0.8,
  );
  if (Math.random() > goalChance) {
    addEvent(
      state.events,
      buildLiveEvent(
        state.minute + 1,
        state.attackingTeam.label,
        'save',
        buildSaveText(state.attackingTeam.label, shotXg),
        state.score,
        {
          xg: shotXg,
          scorer:
            (state.attackMode === 'wide'
              ? pickWeightedName(state.attackingTeam.wideScorers)
              : state.attackMode === 'transition'
                ? pickWeightedName(state.attackingTeam.transitionScorers)
                : pickWeightedName(state.attackingTeam.centralScorers)) ??
            pickWeightedName(state.attackingTeam.scorers),
          assister: actionCreator,
        },
      ),
    );
    return;
  }

  const scorers =
    state.attackMode === 'wide'
      ? state.attackingTeam.wideScorers
      : state.attackMode === 'transition'
        ? state.attackingTeam.transitionScorers
        : state.attackingTeam.centralScorers;
  const creators =
    state.attackMode === 'wide'
      ? state.attackingTeam.wideCreators
      : state.attackMode === 'transition'
        ? state.attackingTeam.transitionCreators
        : state.attackingTeam.centralCreators;
  const scorer = pickWeightedName(scorers) ?? pickWeightedName(state.attackingTeam.scorers) ?? 'Un attaquant';
  const assister =
    Math.random() < 0.78
      ? pickWeightedName(creators, scorer) ?? actionCreator
      : undefined;

  if (state.attackingTeam.label === 'user') {
    state.score.user += 1;
  } else {
    state.score.ai += 1;
  }

  addEvent(
    state.events,
    buildLiveEvent(
      state.minute + 1,
      state.attackingTeam.label,
      'goal',
      buildGoalText(state.attackingTeam.label, scorer, state.minute + 1, shotXg, assister),
      state.score,
      {
        scorer,
        assister,
        xg: shotXg,
      },
    ),
  );
}

function runAttackSequence(
  minute: number,
  attackingTeam: TeamContext,
  defendingTeam: TeamContext,
  score: ScoreState,
  events: MatchEvent[],
) {
  const attackMode = getActionMode(attackingTeam, defendingTeam);
  const state: SequenceState = {
    attackingTeam,
    defendingTeam,
    minute,
    attackMode,
    score,
    events,
    xg: 0,
  };

  const buildResult = resolveBuildPhase(state);
  if (!buildResult) {
    return;
  }

  const midfieldResult = resolveMidfieldPhase(state);
  if (!midfieldResult) {
    return;
  }

  const finalThirdResult = resolveFinalThirdPhase(state);
  if (!finalThirdResult) {
    return;
  }

  resolveBoxPhase(state);
}

function buildMatchStats(
  userSummary: MatchSideSummary,
  aiSummary: MatchSideSummary,
  events: MatchEvent[],
) {
  const userPressure = events.filter((event) => event.team === 'user' && event.type === 'pressure').length;
  const aiPressure = events.filter((event) => event.team === 'ai' && event.type === 'pressure').length;
  const userPossession = Math.round(
    clamp(
      50 +
        (userSummary.midfield - aiSummary.midfield) * 0.6 +
        (userSummary.chanceCreation - aiSummary.chanceCreation) * 0.08 +
        (userPressure - aiPressure) * 1.2,
      35,
      65,
    ),
  );
  const aiPossession = 100 - userPossession;
  const userShotEvents = events.filter(
    (event) => event.team === 'user' && isCountedShotEvent(event),
  );
  const aiShotEvents = events.filter(
    (event) => event.team === 'ai' && isCountedShotEvent(event),
  );

  return {
    userStats: {
      possession: userPossession,
      shots: userShotEvents.length,
      shotsOnTarget: userShotEvents.filter((event) => event.type === 'save' || event.type === 'goal').length,
      xg: roundXg(userShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
    },
    aiStats: {
      possession: aiPossession,
      shots: aiShotEvents.length,
      shotsOnTarget: aiShotEvents.filter((event) => event.type === 'save' || event.type === 'goal').length,
      xg: roundXg(aiShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
    },
  };
}

export function simulateMatch(userTeam: Player[], aiTeam: Player[]): MatchResult {
  const userContext = buildTeamContext('user', userTeam);
  const aiContext = buildTeamContext('ai', aiTeam);
  const score: ScoreState = { user: 0, ai: 0 };
  const events: MatchEvent[] = [];

  MATCH_SEGMENTS.forEach((minute) => {
    const userInitiative =
      userContext.midfieldControl * 0.46 +
      userContext.summary.transitionThreat * 0.14 +
      (score.user < score.ai ? 4 : 0) +
      randomBetween(-7, 8);
    const aiInitiative =
      aiContext.midfieldControl * 0.46 +
      aiContext.summary.transitionThreat * 0.14 +
      (score.ai < score.user ? 4 : 0) +
      randomBetween(-7, 8);

    if (userInitiative >= aiInitiative) {
      runAttackSequence(minute, userContext, aiContext, score, events);
    } else {
      runAttackSequence(minute, aiContext, userContext, score, events);
    }

    if (Math.abs(userInitiative - aiInitiative) > 3) {
      if (userInitiative > aiInitiative) {
        runAttackSequence(Math.min(90, minute + 1), userContext, aiContext, score, events);
      } else {
        runAttackSequence(Math.min(90, minute + 1), aiContext, userContext, score, events);
      }
    }
  });

  const orderedEvents = [...events].sort((left, right) => left.minute - right.minute);
  const { userStats, aiStats } = buildMatchStats(userContext.summary, aiContext.summary, orderedEvents);

  return {
    userScore: score.user,
    aiScore: score.ai,
    winner: score.user === score.ai ? 'draw' : score.user > score.ai ? 'user' : 'ai',
    userSummary: userContext.summary,
    aiSummary: aiContext.summary,
    userStats,
    aiStats,
    highlights: buildHighlights(userContext.summary, aiContext.summary, score.user, score.ai, orderedEvents),
    events: orderedEvents,
  };
}
