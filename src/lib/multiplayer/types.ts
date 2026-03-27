import type { DraftRules } from '../game/rules';
import type { MatchSideSummary } from '../game/simulation';

export type MultiplayerRoomStatus = 'waiting' | 'ready' | 'draft' | 'match' | 'finished';

export type MultiplayerPlayerSlot = 'host' | 'guest';

export type MultiplayerDraftTurn = MultiplayerPlayerSlot;

export type MultiplayerDraftPick = {
  team: MultiplayerPlayerSlot;
  playerId: number;
};

export type MultiplayerDraftState = {
  availablePlayerIds: number[];
  hostTeamIds: number[];
  guestTeamIds: number[];
  currentTurn: MultiplayerDraftTurn;
  lastPick: MultiplayerDraftPick | null;
  draftComplete: boolean;
};

export type MultiplayerMatchEvent = {
  minute: number;
  team: MultiplayerPlayerSlot;
  type: 'goal' | 'chance' | 'save' | 'pressure' | 'shot';
  scorer?: string;
  hostScore: number;
  guestScore: number;
  text: string;
};

export type MultiplayerMatchResult = {
  hostScore: number;
  guestScore: number;
  winner: MultiplayerPlayerSlot | 'draw';
  hostSummary: MatchSideSummary;
  guestSummary: MatchSideSummary;
  highlights: string[];
  events: MultiplayerMatchEvent[];
};

export type MultiplayerMatchReadyState = {
  host: boolean;
  guest: boolean;
};

export type MultiplayerRoom = {
  id: string;
  status: MultiplayerRoomStatus;
  hostName: string | null;
  guestName: string | null;
  rules: DraftRules;
  draftState: MultiplayerDraftState | null;
  matchReady: MultiplayerMatchReadyState | null;
  matchResult: MultiplayerMatchResult | null;
  matchStartedAt: string | null;
  createdAt: string;
};

export type MultiplayerSetupState = {
  hostName: string;
  guestName: string;
  roomId: string | null;
  inviteLink: string | null;
  room: MultiplayerRoom | null;
  localSlot: MultiplayerPlayerSlot | null;
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
};

export const DEFAULT_MULTIPLAYER_SETUP: MultiplayerSetupState = {
  hostName: '',
  guestName: '',
  roomId: null,
  inviteLink: null,
  room: null,
  localSlot: null,
  isCreating: false,
  isJoining: false,
  error: null,
};
