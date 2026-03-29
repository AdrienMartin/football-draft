import type { Player, PlayerPosition } from '../../types/player';
import { canAddPlayerWithinBudget } from './rules';

export const DRAFT_TEAM_SIZE = 5;
export const REQUIRED_ROLES = ['GK', 'DEF', 'MID', 'FWD'] as const;
export const MAX_PLAYERS_PER_ROLE: Record<PlayerRole, number> = {
  GK: 1,
  DEF: 2,
  MID: 2,
  FWD: 2,
};

export type DraftTurn = 'user' | 'ai';
export type PlayerRole = (typeof REQUIRED_ROLES)[number];

export function getPlayerRole(position: PlayerPosition): PlayerRole {
  if (position === 'GK') {
    return 'GK';
  }

  if (position === 'RB' || position === 'LB' || position === 'CB') {
    return 'DEF';
  }

  if (position === 'CDM' || position === 'CM' || position === 'CAM') {
    return 'MID';
  }

  return 'FWD';
}

export function sortPlayersForDraft(players: Player[]) {
  return [...players].sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    return b.value - a.value;
  });
}

export function getTeamRoleCounts(players: Player[]) {
  return players.reduce<Record<PlayerRole, number>>(
    (counts, player) => {
      const role = getPlayerRole(player.position);
      counts[role] += 1;
      return counts;
    },
    { GK: 0, DEF: 0, MID: 0, FWD: 0 },
  );
}

export function getMissingRequiredRoles(players: Player[]) {
  const counts = getTeamRoleCounts(players);
  return REQUIRED_ROLES.filter((role) => counts[role] === 0);
}

export function canDraftPlayer(
  team: Player[],
  candidate: Player,
  maxTeamValue: number | null = null,
) {
  if (team.length >= DRAFT_TEAM_SIZE) {
    return false;
  }

  const candidateRole = getPlayerRole(candidate.position);
  const currentCounts = getTeamRoleCounts(team);

  if (currentCounts[candidateRole] >= MAX_PLAYERS_PER_ROLE[candidateRole]) {
    return false;
  }

  if (!canAddPlayerWithinBudget(team, candidate, maxTeamValue)) {
    return false;
  }

  const nextTeam = [...team, candidate];
  const remainingSlots = DRAFT_TEAM_SIZE - nextTeam.length;
  const missingRoles = getMissingRequiredRoles(nextTeam);

  return missingRoles.length <= remainingSlots;
}

export function getEligiblePlayers(
  team: Player[],
  players: Player[],
  maxTeamValue: number | null = null,
) {
  return players.filter((player) => canDraftPlayer(team, player, maxTeamValue));
}

function getRemainingBudget(team: Player[], maxTeamValue: number | null) {
  if (maxTeamValue === null) {
    return null;
  }

  return maxTeamValue - team.reduce((sum, player) => sum + player.value, 0);
}

function getRoleFillPriority(team: Player[], candidate: Player) {
  const counts = getTeamRoleCounts(team);
  const role = getPlayerRole(candidate.position);
  const missingRoles = getMissingRequiredRoles(team);

  if (missingRoles.includes(role)) {
    return counts[role] === 0 ? 18 : 12;
  }

  if (counts[role] === 0) {
    return 8;
  }

  if (counts[role] === 1) {
    return 3;
  }

  return -4;
}

function getRoleProfileScore(candidate: Player) {
  switch (candidate.position) {
    case 'GK':
      return (
        (candidate.stats.goalkeeping ?? 0) * 0.62 +
        (candidate.stats.reflexes ?? 0) * 0.18 +
        (candidate.stats.handling ?? 0) * 0.12 +
        (candidate.stats.aerial ?? 0) * 0.08
      );
    case 'CB':
      return candidate.stats.defense * 0.62 + candidate.stats.physical * 0.24 + candidate.stats.passing * 0.14;
    case 'RB':
    case 'LB':
      return (
        candidate.stats.defense * 0.34 +
        candidate.stats.pace * 0.24 +
        candidate.stats.passing * 0.22 +
        candidate.stats.dribbling * 0.2
      );
    case 'CDM':
      return (
        candidate.stats.defense * 0.34 +
        candidate.stats.passing * 0.26 +
        candidate.stats.physical * 0.22 +
        candidate.stats.dribbling * 0.1 +
        candidate.stats.shooting * 0.08
      );
    case 'CM':
      return (
        candidate.stats.passing * 0.32 +
        candidate.stats.dribbling * 0.2 +
        candidate.stats.defense * 0.16 +
        candidate.stats.physical * 0.16 +
        candidate.stats.shooting * 0.16
      );
    case 'CAM':
      return (
        candidate.stats.passing * 0.34 +
        candidate.stats.dribbling * 0.24 +
        candidate.stats.shooting * 0.22 +
        candidate.stats.pace * 0.12 +
        candidate.stats.physical * 0.08
      );
    case 'LW':
    case 'RW':
      return (
        candidate.stats.dribbling * 0.3 +
        candidate.stats.pace * 0.24 +
        candidate.stats.shooting * 0.2 +
        candidate.stats.passing * 0.18 +
        candidate.stats.physical * 0.08
      );
    case 'CF':
      return (
        candidate.stats.shooting * 0.34 +
        candidate.stats.passing * 0.24 +
        candidate.stats.dribbling * 0.2 +
        candidate.stats.pace * 0.12 +
        candidate.stats.physical * 0.1
      );
    case 'ST':
    default:
      return (
        candidate.stats.shooting * 0.44 +
        candidate.stats.pace * 0.18 +
        candidate.stats.dribbling * 0.16 +
        candidate.stats.physical * 0.12 +
        candidate.stats.passing * 0.1
      );
  }
}

function estimateCompletionFloor(team: Player[], remainingPlayers: Player[], maxTeamValue: number | null) {
  const currentCounts = getTeamRoleCounts(team);
  const missingRoles = REQUIRED_ROLES.filter((role) => currentCounts[role] === 0);
  const slotsLeft = DRAFT_TEAM_SIZE - team.length;

  if (slotsLeft <= 0) {
    return 0;
  }

  let estimatedCost = 0;
  const reservedPlayerIds = new Set<number>();

  for (const role of missingRoles) {
    const cheapestForRole = remainingPlayers
      .filter((player) => !reservedPlayerIds.has(player.id) && getPlayerRole(player.position) === role)
      .sort((a, b) => a.value - b.value)[0];

    if (!cheapestForRole) {
      return Number.POSITIVE_INFINITY;
    }

    estimatedCost += cheapestForRole.value;
    reservedPlayerIds.add(cheapestForRole.id);
  }

  const extraSlots = slotsLeft - missingRoles.length;

  if (extraSlots <= 0) {
    return estimatedCost;
  }

  const projectedCounts = { ...currentCounts };
  missingRoles.forEach((role) => {
    projectedCounts[role] += 1;
  });

  const cheapestFlexPlayers = remainingPlayers
    .filter((player) => {
      if (reservedPlayerIds.has(player.id)) {
        return false;
      }

      const role = getPlayerRole(player.position);
      return projectedCounts[role] < MAX_PLAYERS_PER_ROLE[role];
    })
    .sort((a, b) => a.value - b.value)
    .slice(0, extraSlots);

  if (cheapestFlexPlayers.length < extraSlots) {
    return Number.POSITIVE_INFINITY;
  }

  estimatedCost += cheapestFlexPlayers.reduce((sum, player) => sum + player.value, 0);

  if (maxTeamValue !== null && estimatedCost > maxTeamValue) {
    return estimatedCost;
  }

  return estimatedCost;
}

function getBudgetDisciplineScore(
  team: Player[],
  candidate: Player,
  remainingPlayers: Player[],
  maxTeamValue: number | null,
) {
  if (maxTeamValue === null) {
    return 0;
  }

  const remainingBudget = getRemainingBudget(team, maxTeamValue);

  if (remainingBudget === null) {
    return 0;
  }

  const budgetAfterPick = remainingBudget - candidate.value;
  const nextTeam = [...team, candidate];
  const otherPlayers = remainingPlayers.filter((player) => player.id !== candidate.id);
  const completionFloor = estimateCompletionFloor(nextTeam, otherPlayers, maxTeamValue);

  if (!Number.isFinite(completionFloor) || completionFloor > budgetAfterPick) {
    return -1000;
  }

  const slotsAfterPick = DRAFT_TEAM_SIZE - nextTeam.length;

  if (slotsAfterPick <= 0) {
    return 2;
  }

  const idealBudgetPerSlot = budgetAfterPick / slotsAfterPick;
  const valueGap = candidate.value - idealBudgetPerSlot;

  if (valueGap > 18) {
    return -10;
  }

  if (valueGap > 10) {
    return -6;
  }

  if (valueGap < -8) {
    return 4;
  }

  return 1;
}

function scoreAiCandidate(
  team: Player[],
  candidate: Player,
  remainingPlayers: Player[],
  maxTeamValue: number | null,
) {
  const role = getPlayerRole(candidate.position);
  const counts = getTeamRoleCounts(team);
  const roleFillPriority = getRoleFillPriority(team, candidate);
  const roleProfileScore = getRoleProfileScore(candidate);
  const valueEfficiency = candidate.value > 0 ? candidate.rating / candidate.value : candidate.rating;
  const budgetDiscipline = getBudgetDisciplineScore(team, candidate, remainingPlayers, maxTeamValue);
  const balancePenalty = counts[role] >= 1 && getMissingRequiredRoles(team).length > 0 ? -3 : 0;

  return (
    candidate.rating * 1.35 +
    roleProfileScore * 0.22 +
    roleFillPriority +
    valueEfficiency * 7 +
    budgetDiscipline +
    balancePenalty
  );
}

export function getAiPick(team: Player[], players: Player[], maxTeamValue: number | null = null) {
  const eligiblePlayers = getEligiblePlayers(team, players, maxTeamValue);

  if (eligiblePlayers.length === 0) {
    return null;
  }

  return [...eligiblePlayers].sort((left, right) => {
    const rightScore = scoreAiCandidate(team, right, eligiblePlayers, maxTeamValue);
    const leftScore = scoreAiCandidate(team, left, eligiblePlayers, maxTeamValue);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    if (right.rating !== left.rating) {
      return right.rating - left.rating;
    }

    return left.value - right.value;
  })[0] ?? null;
}

export function isDraftComplete(userTeam: Player[], aiTeam: Player[]) {
  return userTeam.length >= DRAFT_TEAM_SIZE && aiTeam.length >= DRAFT_TEAM_SIZE;
}
