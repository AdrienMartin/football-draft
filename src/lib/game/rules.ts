import type { Player } from '../../types/player';

export type DraftRules = {
  maxTeamValue: number | null;
  league: string | null;
  nationality: string | null;
};

export const DEFAULT_DRAFT_RULES: DraftRules = {
  maxTeamValue: null,
  league: null,
  nationality: null,
};

export function applyDraftRules(players: Player[], rules: DraftRules) {
  return players.filter((player) => {
    if (rules.league && player.league !== rules.league) {
      return false;
    }

    if (rules.nationality && player.nationality !== rules.nationality) {
      return false;
    }

    return true;
  });
}

export function getTeamValue(players: Player[]) {
  return players.reduce((sum, player) => sum + player.value, 0);
}

export function canAddPlayerWithinBudget(
  team: Player[],
  candidate: Player,
  maxTeamValue: number | null,
) {
  if (maxTeamValue === null) {
    return true;
  }

  return getTeamValue(team) + candidate.value <= maxTeamValue;
}
