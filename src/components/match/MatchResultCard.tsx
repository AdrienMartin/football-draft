import { useEffect, useMemo, useState } from 'react';
import type { MatchEvent, MatchResult } from '../../lib/game/simulation';
import type { Player } from '../../types/player';
import { TeamPitch } from './TeamPitch';

type MatchResultCardProps = {
  result: MatchResult;
  userTeam: Player[];
  aiTeam: Player[];
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

function buildScorerSummary(events: MatchEvent[]) {
  const goals = events.filter((event) => event.type === 'goal' && event.scorer);
  const userScorers = new Map<string, number>();
  const aiScorers = new Map<string, number>();

  goals.forEach((event) => {
    const scorers = event.team === 'user' ? userScorers : aiScorers;
    scorers.set(event.scorer!, (scorers.get(event.scorer!) ?? 0) + 1);
  });

  return {
    user: [...userScorers.entries()].map(([name, total]) => `${name}${total > 1 ? ` x${total}` : ''}`),
    ai: [...aiScorers.entries()].map(([name, total]) => `${name}${total > 1 ? ` x${total}` : ''}`),
  };
}

export function MatchResultCard({
  result,
  userTeam,
  aiTeam,
  onReplay,
  onResetDraft,
}: MatchResultCardProps) {
  const [minute, setMinute] = useState(0);
  const [scorePulse, setScorePulse] = useState(false);
  const [isHalfTime, setIsHalfTime] = useState(false);

  useEffect(() => {
    setMinute(0);
    setIsHalfTime(false);

    let intervalId: number | null = null;
    let halfTimeTimeoutId: number | null = null;

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

          if (nextMinute === HALF_TIME_MINUTE) {
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

    startClock();

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (halfTimeTimeoutId !== null) {
        window.clearTimeout(halfTimeTimeoutId);
      }
    };
  }, [result]);

  const visibleEvents = result.events.filter((event) => event.minute <= minute);
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

  const isFinished = minute >= MATCH_DURATION;
  const title = isFinished
    ? result.winner === 'draw'
      ? 'Match nul'
      : result.winner === 'user'
        ? 'Victoire de ton équipe'
        : "Victoire de l’IA"
    : 'Match en cours';

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="text-center text-2xl font-semibold text-white">{title}</h2>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div
          className={`rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center transition ${scorePulse ? 'scale-[1.03]' : ''}`}
        >
          <p className="text-sm text-slate-400">Ton équipe</p>
          <p className="mt-2 text-5xl font-bold text-white">{liveScore.user}</p>
          <div className="mt-3 min-h-10 text-sm text-slate-300">
            {scorers.user.length > 0 ? <p>{scorers.user.join(', ')}</p> : null}
          </div>
        </div>
        <div className="flex min-w-28 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {isHalfTime ? 'Pause' : 'Chrono'}
          </p>
          <p className="mt-2 text-4xl font-bold text-white">
            {isHalfTime ? 'Mi-temps' : `${minute}'`}
          </p>
        </div>
        <div
          className={`rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center transition ${scorePulse ? 'scale-[1.03]' : ''}`}
        >
          <p className="text-sm text-slate-400">Équipe IA</p>
          <p className="mt-2 text-5xl font-bold text-white">{liveScore.ai}</p>
          <div className="mt-3 min-h-10 text-sm text-slate-300">
            {scorers.ai.length > 0 ? <p>{scorers.ai.join(', ')}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TeamPitch title="Ton équipe" players={userTeam} side="left" compact />
        <TeamPitch title="Équipe IA" players={aiTeam} side="right" compact />
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ton équipe</p>
            <p className="mt-2 text-sm text-slate-300">
              Général {result.userSummary.overall} - Attaque {result.userSummary.attack} - Milieu{' '}
              {result.userSummary.midfield} - Défense {result.userSummary.defense}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Équipe IA</p>
            <p className="mt-2 text-sm text-slate-300">
              Général {result.aiSummary.overall} - Attaque {result.aiSummary.attack} - Milieu{' '}
              {result.aiSummary.midfield} - Défense {result.aiSummary.defense}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Déroulé du match</p>
            <p className="text-xs text-slate-400">{visibleEvents.length} événement(s)</p>
          </div>

          <div className="mt-4 space-y-3">
            {visibleEvents.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400">
                Le match vient de commencer. Attends les premières actions...
              </p>
            )}

            {visibleEvents.map((event) => {
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
                        ? `⚽ But${event.team === 'user' ? ' pour ton équipe' : ' pour l’IA'}`
                        : event.text}
                    </p>
                    <span className={`${isGoal ? 'text-sm font-bold' : 'text-xs'} ${styles.minute}`}>
                      {event.minute}'
                    </span>
                  </div>
                  {isGoal && <p className="mt-2 text-sm font-medium text-white">{event.text}</p>}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${styles.badge}`}
                    >
                      {isGoal ? 'But' : event.type}
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

        {isFinished && (
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-white">Résumé du match</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {result.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
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
        </div>
      </div>
    </section>
  );
}
