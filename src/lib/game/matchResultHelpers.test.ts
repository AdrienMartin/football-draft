import { describe, expect, it } from 'vitest';
import type { MatchResult } from './simulation';
import {
  buildScorerSummary,
  buildVisibleStats,
  isCountedShotEvent,
} from './matchResultHelpers';

const result: MatchResult = {
  userScore: 2,
  aiScore: 1,
  winner: 'user',
  userSummary: {
    attack: 78,
    midfield: 76,
    defense: 72,
    overall: 76,
    goalkeeping: 70,
    chanceCreation: 79,
    finishing: 80,
    transitionThreat: 75,
    shotPrevention: 71,
    saveRate: 69,
  },
  aiSummary: {
    attack: 73,
    midfield: 72,
    defense: 70,
    overall: 72,
    goalkeeping: 71,
    chanceCreation: 72,
    finishing: 74,
    transitionThreat: 71,
    shotPrevention: 70,
    saveRate: 70,
  },
  userStats: {
    possession: 52,
    shots: 6,
    shotsOnTarget: 4,
    xg: 1.64,
  },
  aiStats: {
    possession: 48,
    shots: 4,
    shotsOnTarget: 2,
    xg: 0.77,
  },
  highlights: [],
  events: [
    {
      minute: 10,
      team: 'user',
      type: 'shot',
      scorer: 'Player A',
      xg: 0.12,
      userScore: 0,
      aiScore: 0,
      text: 'Frappe de Player A.',
    },
    {
      minute: 17,
      team: 'user',
      type: 'goal',
      scorer: 'Player A',
      xg: 0.42,
      userScore: 1,
      aiScore: 0,
      text: 'Player A marque.',
    },
    {
      minute: 31,
      team: 'ai',
      type: 'goal',
      xg: 0.21,
      userScore: 1,
      aiScore: 1,
      text: 'But adverse.',
    },
    {
      minute: 74,
      team: 'user',
      type: 'save',
      scorer: 'Player B',
      xg: 0.33,
      userScore: 1,
      aiScore: 1,
      text: 'Arret sur Player B.',
    },
    {
      minute: 82,
      team: 'user',
      type: 'goal',
      scorer: 'Player B',
      xg: 0.29,
      userScore: 2,
      aiScore: 1,
      text: 'Player B donne la victoire.',
    },
  ],
};

describe('match result helpers', () => {
  it('counts shot-like events consistently', () => {
    expect(isCountedShotEvent(result.events[0]!)).toBe(true);
    expect(isCountedShotEvent(result.events[1]!)).toBe(true);
    expect(isCountedShotEvent(result.events[3]!)).toBe(true);
    expect(isCountedShotEvent({ ...result.events[0]!, type: 'pressure' })).toBe(false);
  });

  it('builds scorer summaries including a fallback label for unnamed scorers', () => {
    const summary = buildScorerSummary(result.events);

    expect(summary.user).toEqual(['Player A', 'Player B']);
    expect(summary.ai).toEqual(['Buteur non identifie']);
  });

  it('derives visible stats from visible events', () => {
    const stats = buildVisibleStats(result, result.events);

    expect(stats.user.shots).toBe(4);
    expect(stats.user.shotsOnTarget).toBe(3);
    expect(stats.user.xg).toBe('1.16');
    expect(stats.ai.shots).toBe(1);
    expect(stats.ai.shotsOnTarget).toBe(1);
    expect(stats.ai.xg).toBe('0.21');
  });
});
