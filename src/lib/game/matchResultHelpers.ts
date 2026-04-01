import type { MatchEvent, MatchResult } from './simulation';

export function roundDisplayedXg(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function isCountedShotEvent(event: MatchEvent) {
  return (
    event.type === 'shot' ||
    event.type === 'save' ||
    event.type === 'goal' ||
    event.type === 'block'
  );
}

export function buildScorerSummary(events: MatchEvent[]) {
  const goals = events.filter((event) => event.type === 'goal');
  const userScorers = new Map<string, number>();
  const aiScorers = new Map<string, number>();

  goals.forEach((event) => {
    const scorerName = event.scorer?.trim() || 'Buteur non identifie';
    const scorers = event.team === 'user' ? userScorers : aiScorers;
    scorers.set(scorerName, (scorers.get(scorerName) ?? 0) + 1);
  });

  return {
    user: [...userScorers.entries()].map(
      ([name, total]) => `${name}${total > 1 ? ` x${total}` : ''}`,
    ),
    ai: [...aiScorers.entries()].map(
      ([name, total]) => `${name}${total > 1 ? ` x${total}` : ''}`,
    ),
  };
}

export function buildVisibleStats(result: MatchResult, visibleEvents: MatchEvent[]) {
  const userShotEvents = visibleEvents.filter(
    (event) => event.team === 'user' && isCountedShotEvent(event),
  );
  const aiShotEvents = visibleEvents.filter(
    (event) => event.team === 'ai' && isCountedShotEvent(event),
  );

  return {
    user: {
      possession: result.userStats.possession,
      shots: userShotEvents.length,
      shotsOnTarget: userShotEvents.filter(
        (event) => event.type === 'save' || event.type === 'goal',
      ).length,
      xg: roundDisplayedXg(userShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
    },
    ai: {
      possession: result.aiStats.possession,
      shots: aiShotEvents.length,
      shotsOnTarget: aiShotEvents.filter(
        (event) => event.type === 'save' || event.type === 'goal',
      ).length,
      xg: roundDisplayedXg(aiShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
    },
  };
}

export function toNumericCommentaryStats(stats: ReturnType<typeof buildVisibleStats>['user']) {
  return {
    ...stats,
    xg: Number(stats.xg),
  };
}
