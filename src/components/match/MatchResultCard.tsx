import { useEffect, useMemo, useState } from 'react';
import type { MatchEvent, MatchResult } from '../../lib/game/simulation';
import type { Player } from '../../types/player';
import { TeamPitch } from './TeamPitch';

type MatchResultCardProps = {
  result: MatchResult;
  userTeam: Player[];
  aiTeam: Player[];
  opponentLabel?: string;
  startedAt?: string | null;
  showReplayActions?: boolean;
  onReplay: () => void;
  onResetDraft: () => void;
};

const MATCH_DURATION = 90;
const MINUTE_STEP = 1;
const TICK_MS = 100;
const HALF_TIME_MINUTE = 45;
const HALF_TIME_PAUSE_MS = 2000;

function getEventStyle(event: MatchEvent) {
  if (event.type === 'goal') {
    if (event.team === 'user') {
      return {
        container:
          'ml-0 mr-auto max-w-[92%] border-amber-300/60 bg-gradient-to-r from-amber-300/20 to-emerald-400/15 shadow-lg shadow-amber-950/30',
        badge: 'bg-amber-300 text-slate-950',
        title: 'text-white',
        minute: 'text-amber-100',
        score: 'text-amber-100',
      };
    }

    return {
      container:
        'ml-auto mr-0 max-w-[92%] border-amber-300/60 bg-gradient-to-l from-amber-300/20 to-sky-400/15 shadow-lg shadow-amber-950/30',
      badge: 'bg-amber-300 text-slate-950',
      title: 'text-white',
      minute: 'text-amber-100',
      score: 'text-amber-100',
    };
  }

  if (event.team === 'user') {
    return {
      container: 'ml-0 mr-auto max-w-[85%] border-emerald-400/30 bg-emerald-400/10',
      badge: 'bg-emerald-500/20 text-emerald-100',
      title: 'text-white',
      minute: 'text-slate-400',
      score: 'text-slate-400',
    };
  }

  return {
    container: 'ml-auto mr-0 max-w-[85%] border-sky-400/30 bg-sky-400/10',
    badge: 'bg-sky-500/20 text-sky-100',
    title: 'text-white',
    minute: 'text-slate-400',
    score: 'text-slate-400',
  };
}

function getEventBadgeLabel(event: MatchEvent) {
  switch (event.type) {
    case 'goal':
      return 'But';
    case 'chance':
      return 'Occasion';
    case 'save':
      return 'Arrêt';
    case 'pressure':
      return 'Temps fort';
    case 'shot':
      return 'Frappe';
    case 'counter':
      return 'Contre';
    case 'cross':
      return 'Centre';
    case 'block':
      return 'Contre déf.';
    default:
      return event.type;
  }
}

function buildScorerSummary(events: MatchEvent[]) {
  const goals = events.filter((event) => event.type === 'goal' && event.scorer);
  const userScorers = new Map<string, number>();
  const aiScorers = new Map<string, number>();

  goals.forEach((event) => {
    const scorers = event.team === 'user' ? userScorers : aiScorers;
    scorers.set(event.scorer!, (scorers.get(event.scorer!) ?? 0) + 1);
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

function getInitialMinute(startedAt: string | null | undefined) {
  if (!startedAt) {
    return 0;
  }

  const startTime = new Date(startedAt).getTime();

  if (Number.isNaN(startTime)) {
    return 0;
  }

  const diff = Date.now() - startTime;

  if (diff <= 0) {
    return 0;
  }

  return Math.min(MATCH_DURATION, Math.floor(diff / TICK_MS) * MINUTE_STEP);
}

function getOpponentTextParts(opponentLabel: string) {
  if (opponentLabel === 'Équipe IA') {
    return {
      cardLabel: opponentLabel,
      sentenceLabel: "l'IA",
      plainName: 'IA',
      goalTarget: "l'IA",
    };
  }

  return {
    cardLabel: opponentLabel,
    sentenceLabel: "l'équipe adverse",
    plainName: 'adversaire',
    goalTarget: "l'équipe adverse",
  };
}

function adaptOpponentText(text: string, opponentLabel: string) {
  const parts = getOpponentTextParts(opponentLabel);

  return text
    .replace(/gardien de l['’]IA/g, `gardien de ${parts.sentenceLabel}`)
    .replace(/L['’]IA/g, parts.sentenceLabel)
    .replace(/l['’]IA/g, parts.sentenceLabel)
    .replace(/\bIA\b/g, parts.plainName);
}

function roundXg(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function buildVisibleStats(result: MatchResult, visibleEvents: MatchEvent[]) {
  const userShotEvents = visibleEvents.filter(
    (event) =>
      event.team === 'user' &&
      (event.type === 'shot' || event.type === 'save' || event.type === 'goal'),
  );
  const aiShotEvents = visibleEvents.filter(
    (event) =>
      event.team === 'ai' &&
      (event.type === 'shot' || event.type === 'save' || event.type === 'goal'),
  );

  return {
    user: {
      possession: result.userStats.possession,
      shots: userShotEvents.length,
      shotsOnTarget: userShotEvents.filter(
        (event) => event.type === 'save' || event.type === 'goal',
      ).length,
      xg: roundXg(userShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
      bigChances: visibleEvents.filter(
        (event) => event.team === 'user' && event.type === 'chance' && (event.xg ?? 0) >= 0.28,
      ).length,
      saves: visibleEvents.filter((event) => event.team === 'user' && event.type === 'save').length,
      blocks: visibleEvents.filter((event) => event.team === 'user' && event.type === 'block').length,
      dangerousAttacks: visibleEvents.filter(
        (event) =>
          event.team === 'user' &&
          (event.type === 'chance' || event.type === 'counter' || event.type === 'cross'),
      ).length,
    },
    ai: {
      possession: result.aiStats.possession,
      shots: aiShotEvents.length,
      shotsOnTarget: aiShotEvents.filter(
        (event) => event.type === 'save' || event.type === 'goal',
      ).length,
      xg: roundXg(aiShotEvents.reduce((sum, event) => sum + (event.xg ?? 0), 0)),
      bigChances: visibleEvents.filter(
        (event) => event.team === 'ai' && event.type === 'chance' && (event.xg ?? 0) >= 0.28,
      ).length,
      saves: visibleEvents.filter((event) => event.team === 'ai' && event.type === 'save').length,
      blocks: visibleEvents.filter((event) => event.team === 'ai' && event.type === 'block').length,
      dangerousAttacks: visibleEvents.filter(
        (event) =>
          event.team === 'ai' &&
          (event.type === 'chance' || event.type === 'counter' || event.type === 'cross'),
      ).length,
    },
  };
}

function MatchStatsTable({
  result,
  visibleEvents,
  opponentLabel,
}: {
  result: MatchResult;
  visibleEvents: MatchEvent[];
  opponentLabel: string;
}) {
  const stats = buildVisibleStats(result, visibleEvents);

  const rows = [
    { label: 'Possession', user: `${stats.user.possession}%`, ai: `${stats.ai.possession}%` },
    { label: 'Tirs', user: `${stats.user.shots}`, ai: `${stats.ai.shots}` },
    {
      label: 'Tirs cadrés',
      user: `${stats.user.shotsOnTarget}`,
      ai: `${stats.ai.shotsOnTarget}`,
    },
    { label: 'Arrêts', user: `${stats.user.saves}`, ai: `${stats.ai.saves}` },
    { label: 'Contres déf.', user: `${stats.user.blocks}`, ai: `${stats.ai.blocks}` },
    { label: 'xG', user: stats.user.xg, ai: stats.ai.xg },
  ];
  rows.splice(3, 2);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <p className="text-center font-medium text-white">Ton équipe</p>
        <p className="text-center text-slate-400">Statistiques</p>
        <p className="text-center font-medium text-white">{opponentLabel}</p>

        {rows.map((row) => (
          <div key={row.label} className="contents">
            <p className="border-t border-white/5 py-2 text-center font-semibold text-white">
              {row.user}
            </p>
            <p className="border-t border-white/5 py-2 text-center text-slate-400">
              {row.label}
            </p>
            <p className="border-t border-white/5 py-2 text-center font-semibold text-white">
              {row.ai}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchResultCard({
  result,
  userTeam,
  aiTeam,
  opponentLabel = 'Équipe adverse',
  startedAt = null,
  showReplayActions = true,
  onReplay,
  onResetDraft,
}: MatchResultCardProps) {
  const opponentTextParts = useMemo(
    () => getOpponentTextParts(opponentLabel),
    [opponentLabel],
  );
  const [minute, setMinute] = useState(0);
  const [scorePulse, setScorePulse] = useState(false);
  const [isHalfTime, setIsHalfTime] = useState(false);

  useEffect(() => {
    const initialMinute = getInitialMinute(startedAt);
    setMinute(initialMinute);
    setIsHalfTime(false);

    let intervalId: number | null = null;
    let halfTimeTimeoutId: number | null = null;
    let preStartTimeoutId: number | null = null;

    const startClock = () => {
      intervalId = window.setInterval(() => {
        setMinute((currentMinute) => {
          if (currentMinute >= MATCH_DURATION) {
            if (intervalId !== null) {
              window.clearInterval(intervalId);
            }
            return MATCH_DURATION;
          }

          const nextMinute = Math.min(MATCH_DURATION, currentMinute + MINUTE_STEP);

          if (nextMinute === HALF_TIME_MINUTE && currentMinute < HALF_TIME_MINUTE) {
            if (intervalId !== null) {
              window.clearInterval(intervalId);
            }
            setIsHalfTime(true);
            halfTimeTimeoutId = window.setTimeout(() => {
              setIsHalfTime(false);
              startClock();
            }, HALF_TIME_PAUSE_MS);
          }

          return nextMinute;
        });
      }, TICK_MS);
    };

    const startTime = startedAt ? new Date(startedAt).getTime() : Date.now();
    const delay = Math.max(0, startTime - Date.now());

    if (delay > 0 && initialMinute === 0) {
      preStartTimeoutId = window.setTimeout(startClock, delay);
    } else if (initialMinute < MATCH_DURATION) {
      startClock();
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (halfTimeTimeoutId !== null) {
        window.clearTimeout(halfTimeTimeoutId);
      }
      if (preStartTimeoutId !== null) {
        window.clearTimeout(preStartTimeoutId);
      }
    };
  }, [result, startedAt]);

  const visibleEvents = result.events.filter((event) => event.minute <= minute);
  const orderedVisibleEvents = [...visibleEvents].reverse();
  const liveScore = visibleEvents.reduce(
    (_score, event) => ({
      user: event.userScore,
      ai: event.aiScore,
    }),
    { user: 0, ai: 0 },
  );
  const scorers = useMemo(() => buildScorerSummary(visibleEvents), [visibleEvents]);

  useEffect(() => {
    if (!visibleEvents.some((event) => event.type === 'goal')) {
      return;
    }

    setScorePulse(true);
    const timeoutId = window.setTimeout(() => setScorePulse(false), 260);
    return () => window.clearTimeout(timeoutId);
  }, [visibleEvents.length]);

  const hasStarted = startedAt ? Date.now() >= new Date(startedAt).getTime() : true;
  const isFinished = minute >= MATCH_DURATION;
  const title = !hasStarted
    ? 'Coup d’envoi imminent'
    : isFinished
      ? result.winner === 'draw'
        ? 'Match nul'
        : result.winner === 'user'
          ? 'Victoire de ton équipe'
          : `Victoire de ${opponentTextParts.goalTarget}`
      : 'Match en cours';

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="text-center text-2xl font-semibold text-white">{title}</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div
          className={`rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center transition ${scorePulse ? 'scale-[1.03]' : ''}`}
        >
          <p className="text-sm text-slate-400">Ton équipe</p>
          <p className="mt-1 text-4xl font-bold text-white">{liveScore.user}</p>
          <div className="mt-2 min-h-8 text-sm text-slate-300">
            {scorers.user.length > 0 ? <p>{scorers.user.join(', ')}</p> : null}
          </div>
        </div>

        <div className="flex min-w-24 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {!hasStarted ? 'Départ' : isHalfTime ? 'Pause' : 'Chrono'}
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {!hasStarted ? 'Prêt' : isHalfTime ? 'Mi-temps' : `${minute}'`}
          </p>
        </div>

        <div
          className={`rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center transition ${scorePulse ? 'scale-[1.03]' : ''}`}
        >
          <p className="text-sm text-slate-400">{opponentTextParts.cardLabel}</p>
          <p className="mt-1 text-4xl font-bold text-white">{liveScore.ai}</p>
          <div className="mt-2 min-h-8 text-sm text-slate-300">
            {scorers.ai.length > 0 ? <p>{scorers.ai.join(', ')}</p> : null}
          </div>
        </div>
      </div>

      <MatchStatsTable
        result={result}
        visibleEvents={visibleEvents}
        opponentLabel={opponentTextParts.cardLabel}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TeamPitch title="Ton équipe" players={userTeam} side="left" compact />
        <TeamPitch title={opponentTextParts.cardLabel} players={aiTeam} side="right" compact />
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Déroulé du match</p>
            <p className="text-xs text-slate-400">{visibleEvents.length} événement(s)</p>
          </div>

          <div className="mt-4 space-y-3">
            {!hasStarted && (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
                Les deux joueurs sont prêts. Le match va démarrer en même temps chez tout le monde.
              </p>
            )}

            {hasStarted && visibleEvents.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
                Le match vient de commencer. Attends les premières actions...
              </p>
            )}

            {orderedVisibleEvents.map((event) => {
              const styles = getEventStyle(event);
              const isGoal = event.type === 'goal';

              return (
                <article
                  key={`${event.team}-${event.minute}-${event.type}-${event.text}`}
                  className={`rounded-2xl border px-4 py-3 ${styles.container}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`${isGoal ? 'text-base font-bold uppercase tracking-[0.18em]' : 'text-sm font-semibold'} ${styles.title}`}
                    >
                      {isGoal
                        ? `⚽ But${event.team === 'user' ? ' pour ton équipe' : ` pour ${opponentTextParts.goalTarget}`}`
                        : adaptOpponentText(event.text, opponentLabel)}
                    </p>
                    <span className={`${isGoal ? 'text-sm font-bold' : 'text-xs'} ${styles.minute}`}>
                      {event.minute}'
                    </span>
                  </div>

                  {isGoal && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-medium text-white">
                        {adaptOpponentText(event.text, opponentLabel)}
                      </p>
                      {event.assister ? (
                        <p className="text-xs text-slate-300">
                          Passe décisive : {event.assister}
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${styles.badge}`}
                    >
                      {getEventBadgeLabel(event)}
                    </span>
                    <p className={`${isGoal ? 'text-sm font-bold' : 'text-xs'} ${styles.score}`}>
                      Score : {event.userScore} - {event.aiScore}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {showReplayActions ? (
            <>
              <button
                type="button"
                onClick={onReplay}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Rejouer le match
              </button>
              <button
                type="button"
                onClick={onResetDraft}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Nouvelle draft
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onResetDraft}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Retour à l’accueil
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
