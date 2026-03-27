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
    ai: [...aiScorers.entries()].map(([name, total]) => `${name}${total > 1 ? ` x${total}` : ''}`),
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

function adaptOpponentText(text: string, opponentLabel: string) {
  return text
    .replace(/L['’]IA/g, opponentLabel)
    .replace(/l['’]IA/g, opponentLabel.toLowerCase())
    .replace(/gardien de l['’]IA/g, `gardien de ${opponentLabel.toLowerCase()}`)
    .replace(/\bIA\b/g, opponentLabel);
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
          : `Victoire de ${opponentLabel.toLowerCase()}`
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
            {!hasStarted ? 'Départ' : isHalfTime ? 'Pause' : 'Chrono'}
          </p>
          <p className="mt-2 text-4xl font-bold text-white">
            {!hasStarted ? 'Prêt' : isHalfTime ? 'Mi-temps' : `${minute}'`}
          </p>
        </div>
        <div
          className={`rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-center transition ${scorePulse ? 'scale-[1.03]' : ''}`}
        >
          <p className="text-sm text-slate-400">{opponentLabel}</p>
          <p className="mt-2 text-5xl font-bold text-white">{liveScore.ai}</p>
          <div className="mt-3 min-h-10 text-sm text-slate-300">
            {scorers.ai.length > 0 ? <p>{scorers.ai.join(', ')}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TeamPitch title="Ton équipe" players={userTeam} side="left" compact />
        <TeamPitch title={opponentLabel} players={aiTeam} side="right" compact />
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{opponentLabel}</p>
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
                        ? `⚽ But${event.team === 'user' ? ' pour ton équipe' : ` pour ${opponentLabel.toLowerCase()}`}`
                        : adaptOpponentText(event.text, opponentLabel)}
                    </p>
                    <span className={`${isGoal ? 'text-sm font-bold' : 'text-xs'} ${styles.minute}`}>
                      {event.minute}'
                    </span>
                  </div>
                  {isGoal && (
                    <p className="mt-2 text-sm font-medium text-white">
                      {adaptOpponentText(event.text, opponentLabel)}
                    </p>
                  )}
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
                <li key={highlight}>{adaptOpponentText(highlight, opponentLabel)}</li>
              ))}
            </ul>
          </div>
        )}

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
