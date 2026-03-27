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

export function getAiPick(team: Player[], players: Player[], maxTeamValue: number | null = null) {
  return sortPlayersForDraft(getEligiblePlayers(team, players, maxTeamValue))[0] ?? null;
}

export function isDraftComplete(userTeam: Player[], aiTeam: Player[]) {
  return userTeam.length >= DRAFT_TEAM_SIZE && aiTeam.length >= DRAFT_TEAM_SIZE;
}
