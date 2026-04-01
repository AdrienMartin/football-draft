import { describe, expect, it } from 'vitest';
import type { Player, PlayerPosition, PlayerStats } from '../../types/player';
import {
  DRAFT_TEAM_SIZE,
  canDraftPlayer,
  getEligiblePlayers,
  getMissingRequiredRoles,
  getPlayerRole,
  getTeamRoleCounts,
  isDraftComplete,
  sortPlayersForDraft,
} from './draft';

function createPlayer(
  id: number,
  name: string,
  position: PlayerPosition,
  rating: number,
  value: number,
): Player {
  const stats: PlayerStats = {
    pace: 70,
    shooting: 70,
    passing: 70,
    dribbling: 70,
    defense: 70,
    physical: 70,
    vision: 70,
    composure: 70,
    tackling: 70,
    positioning: 70,
    crossing: 70,
    ...(position === 'GK'
      ? {
          goalkeeping: 80,
          reflexes: 80,
          handling: 80,
          distribution: 75,
          aerial: 78,
          shotStopping: 82,
          commandOfArea: 79,
        }
      : {}),
  };

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

describe('draft rules helpers', () => {
  it('maps positions to the expected draft role buckets', () => {
    expect(getPlayerRole('GK')).toBe('GK');
    expect(getPlayerRole('CB')).toBe('DEF');
    expect(getPlayerRole('CDM')).toBe('MID');
    expect(getPlayerRole('ST')).toBe('FWD');
  });

  it('computes role counts and missing required roles', () => {
    const team = [
      createPlayer(1, 'Keeper', 'GK', 78, 12),
      createPlayer(2, 'Center Back', 'CB', 77, 11),
      createPlayer(3, 'Midfielder', 'CM', 79, 14),
    ];

    expect(getTeamRoleCounts(team)).toEqual({
      GK: 1,
      DEF: 1,
      MID: 1,
      FWD: 0,
    });
    expect(getMissingRequiredRoles(team)).toEqual(['FWD']);
  });

  it('rejects picks that would exceed the max per role', () => {
    const team = [
      createPlayer(1, 'Defender A', 'CB', 77, 11),
      createPlayer(2, 'Defender B', 'RB', 75, 10),
    ];

    expect(canDraftPlayer(team, createPlayer(3, 'Defender C', 'LB', 74, 9), null)).toBe(false);
  });

  it('rejects picks that make the team impossible to complete under budget', () => {
    const team = [
      createPlayer(1, 'Keeper', 'GK', 78, 18),
      createPlayer(2, 'Defender', 'CB', 77, 18),
      createPlayer(3, 'Midfielder', 'CM', 79, 18),
    ];

    expect(canDraftPlayer(team, createPlayer(4, 'Too Expensive Forward', 'ST', 85, 25), 70)).toBe(
      false,
    );
  });

  it('filters eligible players according to the draft rules', () => {
    const team = [
      createPlayer(1, 'Keeper', 'GK', 78, 12),
      createPlayer(2, 'Defender', 'CB', 77, 11),
      createPlayer(3, 'Midfielder', 'CM', 79, 14),
    ];
    const players = [
      createPlayer(4, 'Forward', 'ST', 80, 16),
      createPlayer(5, 'Extra Keeper', 'GK', 75, 8),
    ];

    expect(getEligiblePlayers(team, players, null).map((player) => player.name)).toEqual([
      'Forward',
    ]);
  });

  it('sorts draft players by rating then value', () => {
    const players = [
      createPlayer(1, 'Player A', 'ST', 80, 14),
      createPlayer(2, 'Player B', 'ST', 82, 10),
      createPlayer(3, 'Player C', 'ST', 80, 18),
    ];

    expect(sortPlayersForDraft(players).map((player) => player.name)).toEqual([
      'Player B',
      'Player C',
      'Player A',
    ]);
  });

  it('detects when the draft is complete', () => {
    const completeTeam = Array.from({ length: DRAFT_TEAM_SIZE }, (_, index) =>
      createPlayer(index + 1, `Player ${index + 1}`, index === 0 ? 'GK' : 'ST', 75, 10),
    );

    expect(isDraftComplete(completeTeam, completeTeam)).toBe(true);
    expect(isDraftComplete(completeTeam.slice(0, 4), completeTeam)).toBe(false);
  });
});
