import { describe, expect, it } from 'vitest';
import { buildFullTimeSummary, buildHalfTimeSummary } from './matchCommentary';

describe('match commentary summaries', () => {
  it('builds a half-time summary with two concise lines maximum', () => {
    const summary = buildHalfTimeSummary({
      userScore: 1,
      aiScore: 0,
      userStats: {
        possession: 56,
        shots: 6,
        shotsOnTarget: 3,
        xg: 1.1,
      },
      aiStats: {
        possession: 44,
        shots: 2,
        shotsOnTarget: 1,
        xg: 0.3,
      },
      userSummary: {
        midfield: 79,
        goalkeeping: 74,
      },
      aiSummary: {
        midfield: 71,
        goalkeeping: 70,
      },
    });

    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(2);
    expect(summary[0]).toContain('pause');
  });

  it('builds a full-time summary that reflects the final result', () => {
    const summary = buildFullTimeSummary({
      userScore: 2,
      aiScore: 1,
      userStats: {
        possession: 53,
        shots: 9,
        shotsOnTarget: 5,
        xg: 1.9,
      },
      aiStats: {
        possession: 47,
        shots: 4,
        shotsOnTarget: 2,
        xg: 0.8,
      },
      highlights: ['Ton equipe a souvent eu la main dans l’entrejeu.'],
    });

    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(2);
    expect(summary[0]).toContain("Ton equipe l'emporte");
  });
});
