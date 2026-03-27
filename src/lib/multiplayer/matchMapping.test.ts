import { describe, expect, it } from 'vitest';
import type { MatchResult } from '../game/simulation';
import { toLocalMatchResult, toRoomMatchResult } from './matchMapping';

const baseResult: MatchResult = {
  userScore: 2,
  aiScore: 1,
  winner: 'user',
  userSummary: {
    attack: 80,
    midfield: 78,
    defense: 74,
    overall: 79,
    goalkeeping: 76,
    chanceCreation: 81,
    finishing: 84,
    transitionThreat: 77,
    shotPrevention: 73,
    saveRate: 75,
  },
  aiSummary: {
    attack: 74,
    midfield: 72,
    defense: 70,
    overall: 73,
    goalkeeping: 71,
    chanceCreation: 73,
    finishing: 75,
    transitionThreat: 70,
    shotPrevention: 69,
    saveRate: 70,
  },
  highlights: ['Ton milieu a imposé le rythme du match.'],
  events: [
    {
      minute: 12,
      team: 'user',
      type: 'goal',
      scorer: 'Player A',
      userScore: 1,
      aiScore: 0,
      text: 'Player A conclut l’action.',
    },
    {
      minute: 34,
      team: 'ai',
      type: 'goal',
      scorer: 'Player B',
      userScore: 1,
      aiScore: 1,
      text: 'Player B égalise.',
    },
    {
      minute: 76,
      team: 'user',
      type: 'goal',
      scorer: 'Player C',
      userScore: 2,
      aiScore: 1,
      text: 'Player C redonne l’avantage.',
    },
  ],
};

describe('multiplayer match mapping', () => {
  it('maps a host local result to a room result', () => {
    const roomResult = toRoomMatchResult(baseResult, 'host');

    expect(roomResult.hostScore).toBe(2);
    expect(roomResult.guestScore).toBe(1);
    expect(roomResult.winner).toBe('host');
    expect(roomResult.events[0]?.team).toBe('host');
    expect(roomResult.events[1]?.team).toBe('guest');
    expect(roomResult.events[2]?.hostScore).toBe(2);
    expect(roomResult.events[2]?.guestScore).toBe(1);
  });

  it('maps a guest local result to a room result', () => {
    const roomResult = toRoomMatchResult(baseResult, 'guest');

    expect(roomResult.hostScore).toBe(1);
    expect(roomResult.guestScore).toBe(2);
    expect(roomResult.winner).toBe('guest');
    expect(roomResult.events[0]?.team).toBe('guest');
    expect(roomResult.events[1]?.team).toBe('host');
  });

  it('maps a room result back to a local guest perspective', () => {
    const roomResult = toRoomMatchResult(baseResult, 'host');
    const guestResult = toLocalMatchResult(roomResult, 'guest');

    expect(guestResult.userScore).toBe(1);
    expect(guestResult.aiScore).toBe(2);
    expect(guestResult.winner).toBe('ai');
    expect(guestResult.events[0]?.team).toBe('ai');
    expect(guestResult.events[1]?.team).toBe('user');
  });

  it('keeps draw results stable across room and local mappings', () => {
    const drawResult: MatchResult = {
      ...baseResult,
      userScore: 1,
      aiScore: 1,
      winner: 'draw',
    };

    const roomResult = toRoomMatchResult(drawResult, 'host');
    const localResult = toLocalMatchResult(roomResult, 'guest');

    expect(roomResult.winner).toBe('draw');
    expect(localResult.winner).toBe('draw');
    expect(localResult.userScore).toBe(1);
    expect(localResult.aiScore).toBe(1);
  });
});
