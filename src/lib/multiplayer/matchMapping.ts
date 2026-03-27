import type { MatchResult } from '../game/simulation';
import type {
  MultiplayerMatchEvent,
  MultiplayerMatchResult,
  MultiplayerPlayerSlot,
} from './types';

function mapEventTeam(team: 'user' | 'ai', slot: MultiplayerPlayerSlot): MultiplayerPlayerSlot {
  if (slot === 'host') {
    return team === 'user' ? 'host' : 'guest';
  }

  return team === 'user' ? 'guest' : 'host';
}

export function toRoomMatchResult(
  result: MatchResult,
  slot: MultiplayerPlayerSlot,
): MultiplayerMatchResult {
  const hostScore = slot === 'host' ? result.userScore : result.aiScore;
  const guestScore = slot === 'host' ? result.aiScore : result.userScore;

  return {
    hostScore,
    guestScore,
    winner:
      result.winner === 'draw'
        ? 'draw'
        : result.winner === 'user'
          ? slot
          : slot === 'host'
            ? 'guest'
            : 'host',
    hostSummary: slot === 'host' ? result.userSummary : result.aiSummary,
    guestSummary: slot === 'host' ? result.aiSummary : result.userSummary,
    highlights: result.highlights,
    events: result.events.map<MultiplayerMatchEvent>((event) => ({
      minute: event.minute,
      team: mapEventTeam(event.team, slot),
      type: event.type,
      scorer: event.scorer,
      hostScore: slot === 'host' ? event.userScore : event.aiScore,
      guestScore: slot === 'host' ? event.aiScore : event.userScore,
      text: event.text,
    })),
  };
}

export function toLocalMatchResult(
  matchResult: MultiplayerMatchResult,
  localSlot: MultiplayerPlayerSlot,
): MatchResult {
  const userIsHost = localSlot === 'host';

  return {
    userScore: userIsHost ? matchResult.hostScore : matchResult.guestScore,
    aiScore: userIsHost ? matchResult.guestScore : matchResult.hostScore,
    winner:
      matchResult.winner === 'draw'
        ? 'draw'
        : matchResult.winner === localSlot
          ? 'user'
          : 'ai',
    userSummary: userIsHost ? matchResult.hostSummary : matchResult.guestSummary,
    aiSummary: userIsHost ? matchResult.guestSummary : matchResult.hostSummary,
    highlights: matchResult.highlights,
    events: matchResult.events.map((event) => ({
      minute: event.minute,
      team: event.team === localSlot ? 'user' : 'ai',
      type: event.type,
      scorer: event.scorer,
      userScore: userIsHost ? event.hostScore : event.guestScore,
      aiScore: userIsHost ? event.guestScore : event.hostScore,
      text: event.text,
    })),
  };
}
