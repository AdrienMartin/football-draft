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

function swapPerspectiveText(text: string) {
  return text
    .replace(/Ton équipe/g, '__TMP_USER_TEAM_CAP__')
    .replace(/ton équipe/g, '__TMP_USER_TEAM__')
    .replace(/Ta défense/g, '__TMP_USER_DEF_CAP__')
    .replace(/ta défense/g, '__TMP_USER_DEF__')
    .replace(/Ton gardien/g, '__TMP_USER_GK_CAP__')
    .replace(/ton gardien/g, '__TMP_USER_GK__')
    .replace(/Le gardien adverse/g, '__TMP_OPP_GK_CAP__')
    .replace(/le gardien adverse/g, '__TMP_OPP_GK__')
    .replace(/L['’]IA/g, '__TMP_IA_CAP__')
    .replace(/l['’]IA/g, '__TMP_IA__')
    .replace(/__TMP_USER_TEAM_CAP__/g, "L'IA")
    .replace(/__TMP_USER_TEAM__/g, "l'IA")
    .replace(/__TMP_USER_DEF_CAP__/g, "L'IA")
    .replace(/__TMP_USER_DEF__/g, "l'IA")
    .replace(/__TMP_USER_GK_CAP__/g, "Le gardien de l'IA")
    .replace(/__TMP_USER_GK__/g, "le gardien de l'IA")
    .replace(/__TMP_OPP_GK_CAP__/g, 'Ton gardien')
    .replace(/__TMP_OPP_GK__/g, 'ton gardien')
    .replace(/__TMP_IA_CAP__/g, 'Ton équipe')
    .replace(/__TMP_IA__/g, 'ton équipe');
}

function toLocalEventText(text: string, localSlot: MultiplayerPlayerSlot) {
  return localSlot === 'host' ? text : swapPerspectiveText(text);
}

function toLocalHighlightText(text: string, localSlot: MultiplayerPlayerSlot) {
  return localSlot === 'host' ? text : swapPerspectiveText(text);
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
    hostStats: slot === 'host' ? result.userStats : result.aiStats,
    guestStats: slot === 'host' ? result.aiStats : result.userStats,
    highlights: result.highlights,
    events: result.events.map<MultiplayerMatchEvent>((event) => ({
      minute: event.minute,
      team: mapEventTeam(event.team, slot),
      type: event.type,
      scorer: event.scorer,
      assister: event.assister,
      xg: event.xg,
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
    userStats: userIsHost ? matchResult.hostStats : matchResult.guestStats,
    aiStats: userIsHost ? matchResult.guestStats : matchResult.hostStats,
    highlights: matchResult.highlights.map((highlight) =>
      toLocalHighlightText(highlight, localSlot),
    ),
    events: matchResult.events.map((event) => ({
      minute: event.minute,
      team: event.team === localSlot ? 'user' : 'ai',
      type: event.type,
      scorer: event.scorer,
      assister: event.assister,
      xg: event.xg,
      userScore: userIsHost ? event.hostScore : event.guestScore,
      aiScore: userIsHost ? event.guestScore : event.hostScore,
      text: toLocalEventText(event.text, localSlot),
    })),
  };
}
