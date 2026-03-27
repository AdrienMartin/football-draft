import { create } from 'zustand';
import type { AppStep } from '../lib/game/constants';
import {
  canDraftPlayer,
  getAiPick,
  isDraftComplete,
  sortPlayersForDraft,
  type DraftTurn,
} from '../lib/game/draft';
import {
  applyDraftRules,
  DEFAULT_DRAFT_RULES,
  type DraftRules,
} from '../lib/game/rules';
import {
  confirmMultiplayerMatchStart,
  createMultiplayerRoom,
  getDisconnectedPlayerSlot,
  getMultiplayerRoom,
  heartbeatMultiplayerRoom,
  joinMultiplayerRoom,
  makeMultiplayerPick,
  startMultiplayerDraft,
} from '../lib/multiplayer/rooms';
import { toLocalMatchResult } from '../lib/multiplayer/matchMapping';
import {
  DEFAULT_MULTIPLAYER_SETUP,
  type MultiplayerPlayerSlot,
  type MultiplayerRoom,
  type MultiplayerSetupState,
} from '../lib/multiplayer/types';
import { simulateMatch, type MatchResult } from '../lib/game/simulation';
import type { Player } from '../types/player';

type GameMode = 'solo' | 'multiplayer';

type GameState = {
  currentStep: AppStep;
  mode: GameMode;
  initialPlayers: Player[];
  draftPool: Player[];
  availablePlayers: Player[];
  userTeam: Player[];
  aiTeam: Player[];
  rules: DraftRules;
  multiplayerSetup: MultiplayerSetupState;
  currentTurn: DraftTurn;
  draftComplete: boolean;
  isPlayingMatch: boolean;
  matchStartedAt: string | null;
  lastPick: {
    team: DraftTurn;
    player: Player;
  } | null;
  draftMessage: string | null;
  matchResult: MatchResult | null;
  loadPlayers: (players: Player[]) => void;
  openRules: () => void;
  openMultiplayerSetup: () => void;
  startQuickDraft: () => void;
  startDraft: (rules?: DraftRules) => void;
  updateMultiplayerHostName: (hostName: string) => void;
  updateMultiplayerGuestName: (guestName: string) => void;
  createMultiplayerRoom: (rules: DraftRules) => Promise<void>;
  loadMultiplayerRoomFromLink: (roomId: string) => Promise<void>;
  joinCurrentMultiplayerRoom: () => Promise<void>;
  startCurrentMultiplayerDraft: () => Promise<void>;
  syncMultiplayerRoom: (room: MultiplayerRoom) => void;
  setMultiplayerConnectionIssue: (message: string | null) => void;
  sendMultiplayerHeartbeat: () => Promise<void>;
  resetToLanding: () => void;
  userPickPlayer: (playerId: number) => Promise<void>;
  aiPickTurn: () => void;
  playMatch: () => void;
  replayMatch: () => void;
  resetDraft: () => void;
};

function buildDraftState(players: Player[], rules: DraftRules) {
  return {
    currentStep: 'draft' as AppStep,
    draftPool: players,
    availablePlayers: sortPlayersForDraft(players),
    userTeam: [],
    aiTeam: [],
    rules,
    currentTurn: 'user' as DraftTurn,
    draftComplete: false,
    isPlayingMatch: false,
    matchStartedAt: null,
    lastPick: null,
    draftMessage: null,
    matchResult: null,
  };
}

function buildLandingState(players: Player[]) {
  return {
    currentStep: 'landing' as AppStep,
    mode: 'solo' as GameMode,
    draftPool: [],
    availablePlayers: [],
    userTeam: [],
    aiTeam: [],
    rules: DEFAULT_DRAFT_RULES,
    multiplayerSetup: DEFAULT_MULTIPLAYER_SETUP,
    currentTurn: 'user' as DraftTurn,
    draftComplete: false,
    isPlayingMatch: false,
    matchStartedAt: null,
    lastPick: null,
    draftMessage: null,
    matchResult: null,
    initialPlayers: players,
  };
}

function getLocalMultiplayerSlot(state: GameState): MultiplayerPlayerSlot | null {
  return state.multiplayerSetup.localSlot;
}

function hydrateMultiplayerRoom(room: MultiplayerRoom, state: GameState) {
  const localSlot = getLocalMultiplayerSlot(state);

  if (!room.draftState || !localSlot) {
    const safeStep: AppStep =
      room.matchResult || room.status === 'finished'
        ? 'result'
        : room.status === 'match'
          ? 'match'
          : room.status === 'draft'
            ? 'draft'
            : state.currentStep === 'draft' || state.currentStep === 'match' || state.currentStep === 'result'
              ? state.currentStep
              : 'multiplayer';

    return {
      currentStep: safeStep,
      availablePlayers: state.availablePlayers,
      userTeam: state.userTeam,
      aiTeam: state.aiTeam,
      currentTurn: state.currentTurn,
      draftComplete: state.draftComplete,
      lastPick: state.lastPick,
      draftMessage: state.draftMessage,
      isPlayingMatch: state.isPlayingMatch,
      matchStartedAt: room.matchStartedAt ?? state.matchStartedAt,
      matchResult: room.matchResult && localSlot ? toLocalMatchResult(room.matchResult, localSlot) : state.matchResult,
    };
  }

  const playerMap = new Map(state.initialPlayers.map((player) => [player.id, player]));
  const userTeamIds = localSlot === 'host' ? room.draftState.hostTeamIds : room.draftState.guestTeamIds;
  const opponentTeamIds =
    localSlot === 'host' ? room.draftState.guestTeamIds : room.draftState.hostTeamIds;

  const availablePlayers = room.draftState.availablePlayerIds
    .map((id) => playerMap.get(id))
    .filter((player): player is Player => Boolean(player));
  const userTeam = userTeamIds
    .map((id) => playerMap.get(id))
    .filter((player): player is Player => Boolean(player));
  const aiTeam = opponentTeamIds
    .map((id) => playerMap.get(id))
    .filter((player): player is Player => Boolean(player));
  const currentTurn: DraftTurn = room.draftState.currentTurn === localSlot ? 'user' : 'ai';
  const lastPickedPlayer = room.draftState.lastPick
    ? playerMap.get(room.draftState.lastPick.playerId) ?? null
    : null;
  const translatedLastPickTeam: DraftTurn | null = room.draftState.lastPick
    ? room.draftState.lastPick.team === localSlot
      ? 'user'
      : 'ai'
    : null;
  const localMatchResult = room.matchResult
    ? toLocalMatchResult(room.matchResult, localSlot)
    : null;
  const isWaitingForOtherPlayer =
    room.status === 'match' && !room.matchResult && Boolean(room.matchReady?.[localSlot]);

  return {
    currentStep: room.matchResult ? ('result' as AppStep) : room.status === 'match' || room.status === 'finished'
      ? ('match' as AppStep)
      : ('draft' as AppStep),
    availablePlayers,
    userTeam,
    aiTeam,
    currentTurn,
    draftComplete: room.draftState.draftComplete,
    lastPick:
      room.draftState.lastPick && lastPickedPlayer && translatedLastPickTeam
        ? {
            team: translatedLastPickTeam,
            player: lastPickedPlayer,
          }
        : null,
    draftMessage: null,
    isPlayingMatch: isWaitingForOtherPlayer,
    matchStartedAt: room.matchStartedAt,
    matchResult: localMatchResult,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  currentStep: 'landing',
  mode: 'solo',
  initialPlayers: [],
  draftPool: [],
  availablePlayers: [],
  userTeam: [],
  aiTeam: [],
  rules: DEFAULT_DRAFT_RULES,
  multiplayerSetup: DEFAULT_MULTIPLAYER_SETUP,
  currentTurn: 'user',
  draftComplete: false,
  isPlayingMatch: false,
  matchStartedAt: null,
  lastPick: null,
  draftMessage: null,
  matchResult: null,
  loadPlayers: (players) =>
    set({
      ...buildLandingState(players),
    }),
  openRules: () => {
    const state = get();

    if (state.initialPlayers.length === 0) {
      return;
    }

    set({
      currentStep: 'rules',
      mode: 'solo',
    });
  },
  openMultiplayerSetup: () => {
    const state = get();

    if (state.initialPlayers.length === 0) {
      return;
    }

    set({
      currentStep: 'multiplayer',
      mode: 'multiplayer',
      multiplayerSetup: DEFAULT_MULTIPLAYER_SETUP,
    });
  },
  startQuickDraft: () => {
    const state = get();

    if (state.initialPlayers.length === 0) {
      return;
    }

    set({
      initialPlayers: state.initialPlayers,
      mode: 'solo',
      ...buildDraftState(state.initialPlayers, DEFAULT_DRAFT_RULES),
    });
  },
  startDraft: (rules = DEFAULT_DRAFT_RULES) => {
    const state = get();

    if (state.initialPlayers.length === 0) {
      return;
    }

    const filteredPlayers = applyDraftRules(state.initialPlayers, rules);

    set({
      initialPlayers: state.initialPlayers,
      mode: 'solo',
      ...buildDraftState(filteredPlayers, rules),
    });
  },
  updateMultiplayerHostName: (hostName) =>
    set((state) => ({
      multiplayerSetup: {
        ...state.multiplayerSetup,
        hostName,
      },
    })),
  updateMultiplayerGuestName: (guestName) =>
    set((state) => ({
      multiplayerSetup: {
        ...state.multiplayerSetup,
        guestName,
      },
    })),
  createMultiplayerRoom: async (rules) => {
    const state = get();
    const hostName = state.multiplayerSetup.hostName.trim();

    if (!hostName) {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          error: 'Renseigne un nom de host avant de créer la room.',
        },
      }));
      return;
    }

    set((currentState) => ({
      multiplayerSetup: {
        ...currentState.multiplayerSetup,
        isCreating: true,
        error: null,
      },
    }));

    try {
      const { room, inviteLink } = await createMultiplayerRoom({
        hostName,
        rules,
      });

      set((currentState) => ({
        mode: 'multiplayer',
        rules,
      multiplayerSetup: {
        ...currentState.multiplayerSetup,
        room,
        roomId: room.id,
        inviteLink,
        localSlot: 'host',
        isCreating: false,
        error: null,
        connectionIssue: null,
        opponentDisconnected: false,
      },
      }));
    } catch (error) {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          isCreating: false,
          error: error instanceof Error ? error.message : 'Impossible de créer la room.',
        },
      }));
    }
  },
  loadMultiplayerRoomFromLink: async (roomId) => {
    const state = get();

    set({
      currentStep: 'multiplayer',
      mode: 'multiplayer',
      multiplayerSetup: {
        ...state.multiplayerSetup,
        isJoining: true,
        error: null,
      },
    });

    try {
      const room = await getMultiplayerRoom(roomId);

      set((currentState) => ({
        mode: 'multiplayer',
        rules: room.rules,
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          room,
          roomId: room.id,
          inviteLink: null,
          localSlot: 'guest',
          isJoining: false,
          error: null,
          connectionIssue: null,
          opponentDisconnected: false,
        },
      }));
    } catch (error) {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          isJoining: false,
          error: error instanceof Error ? error.message : 'Impossible de charger la room.',
        },
      }));
    }
  },
  joinCurrentMultiplayerRoom: async () => {
    const state = get();
    const roomId = state.multiplayerSetup.roomId;
    const guestName = state.multiplayerSetup.guestName.trim();

    if (!roomId) {
      return;
    }

    if (!guestName) {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          error: 'Renseigne un nom avant de rejoindre la room.',
        },
      }));
      return;
    }

    set((currentState) => ({
      multiplayerSetup: {
        ...currentState.multiplayerSetup,
        isJoining: true,
        error: null,
      },
    }));

    try {
      const room = await joinMultiplayerRoom(roomId, guestName);

      set((currentState) => ({
        mode: 'multiplayer',
        rules: room.rules,
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          room,
          localSlot: 'guest',
          isJoining: false,
          error: null,
          connectionIssue: null,
          opponentDisconnected: false,
        },
      }));
    } catch (error) {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          isJoining: false,
          error: error instanceof Error ? error.message : 'Impossible de rejoindre la room.',
        },
      }));
    }
  },
  startCurrentMultiplayerDraft: async () => {
    const state = get();
    const roomId = state.multiplayerSetup.roomId;

    if (!roomId) {
      return;
    }

    if (state.multiplayerSetup.localSlot !== 'host') {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          error: 'Seul le host peut lancer la draft.',
        },
      }));
      return;
    }

    try {
      const room = await startMultiplayerDraft(roomId, state.initialPlayers);

      set((currentState) => ({
        mode: 'multiplayer',
        rules: room.rules,
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          room,
          error: null,
          connectionIssue: null,
          opponentDisconnected: false,
        },
        ...hydrateMultiplayerRoom(room, currentState),
      }));
    } catch (error) {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          error: error instanceof Error ? error.message : 'Impossible de lancer la draft.',
        },
      }));
    }
  },
  syncMultiplayerRoom: (room) => {
    set((state) => ({
      ...(room.status === 'draft' || room.status === 'match' || room.status === 'finished'
        ? hydrateMultiplayerRoom(room, state)
        : {}),
      mode: 'multiplayer',
      rules: room.rules,
      multiplayerSetup: {
        ...state.multiplayerSetup,
        room,
        roomId: room.id,
        hostName:
          state.multiplayerSetup.localSlot === 'host' && state.multiplayerSetup.hostName
            ? state.multiplayerSetup.hostName
            : (room.hostName ?? state.multiplayerSetup.hostName),
        guestName:
          state.multiplayerSetup.localSlot === 'guest' && state.multiplayerSetup.guestName
            ? state.multiplayerSetup.guestName
            : (room.guestName ?? state.multiplayerSetup.guestName),
        connectionIssue: null,
        opponentDisconnected:
          room.status !== 'finished' &&
          Boolean(getDisconnectedPlayerSlot(room, state.multiplayerSetup.localSlot)),
      },
    }));
  },
  setMultiplayerConnectionIssue: (message) =>
    set((state) => ({
      multiplayerSetup: {
        ...state.multiplayerSetup,
        connectionIssue: message,
      },
    })),
  sendMultiplayerHeartbeat: async () => {
    const state = get();
    const roomId = state.multiplayerSetup.roomId;
    const localSlot = state.multiplayerSetup.localSlot;

    if (!roomId || !localSlot) {
      return;
    }

    try {
      await heartbeatMultiplayerRoom(roomId, localSlot);
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          connectionIssue: null,
        },
      }));
    } catch (error) {
      set((currentState) => ({
        multiplayerSetup: {
          ...currentState.multiplayerSetup,
          connectionIssue:
            error instanceof Error
              ? error.message
              : 'Impossible de joindre Supabase pour le moment.',
        },
      }));
    }
  },
  resetToLanding: () => {
    const state = get();

    set({
      ...buildLandingState(state.initialPlayers),
    });
  },
  userPickPlayer: async (playerId) => {
    const state = get();

    if (state.mode === 'multiplayer') {
      const roomId = state.multiplayerSetup.roomId;
      const localSlot = state.multiplayerSetup.localSlot;

      if (!roomId || !localSlot) {
        return;
      }

      try {
        const room = await makeMultiplayerPick(roomId, localSlot, playerId, state.initialPlayers);

        set((currentState) => ({
          mode: 'multiplayer',
          rules: room.rules,
          multiplayerSetup: {
            ...currentState.multiplayerSetup,
            room,
            error: null,
          },
          ...hydrateMultiplayerRoom(room, currentState),
        }));
      } catch (error) {
        set({
          draftMessage:
            error instanceof Error ? error.message : 'Impossible d’enregistrer ce choix.',
        });
      }

      return;
    }

    if (state.currentTurn !== 'user' || state.draftComplete) {
      return;
    }

    const selectedPlayer = state.availablePlayers.find((player) => player.id === playerId);

    if (!selectedPlayer) {
      return;
    }

    if (!canDraftPlayer(state.userTeam, selectedPlayer, state.rules.maxTeamValue)) {
      set({
        draftMessage: state.rules.maxTeamValue
          ? `Choix impossible : ton équipe doit respecter les rôles minimums et rester sous ${state.rules.maxTeamValue} MEUR.`
          : 'Choix impossible : ton équipe doit avoir 1 GK minimum, puis au maximum 2 joueurs par ligne DEF, MID et FWD.',
      });
      return;
    }

    const availablePlayers = state.availablePlayers.filter((player) => player.id !== playerId);
    const userTeam = [...state.userTeam, selectedPlayer];
    const draftDone = isDraftComplete(userTeam, state.aiTeam);

    set({
      availablePlayers,
      userTeam,
      currentTurn: draftDone ? 'user' : 'ai',
      draftComplete: draftDone,
      currentStep: draftDone ? 'match' : 'draft',
      lastPick: {
        team: 'user',
        player: selectedPlayer,
      },
      draftMessage: null,
      isPlayingMatch: false,
      matchResult: null,
    });
  },
  aiPickTurn: () => {
    const state = get();

    if (state.mode === 'multiplayer' || state.currentTurn !== 'ai' || state.draftComplete) {
      return;
    }

    const selectedPlayer = getAiPick(
      state.aiTeam,
      state.availablePlayers,
      state.rules.maxTeamValue,
    );

    if (!selectedPlayer) {
      return;
    }

    const availablePlayers = state.availablePlayers.filter(
      (player) => player.id !== selectedPlayer.id,
    );
    const aiTeam = [...state.aiTeam, selectedPlayer];
    const draftDone = isDraftComplete(state.userTeam, aiTeam);

    set({
      availablePlayers,
      aiTeam,
      currentTurn: 'user',
      draftComplete: draftDone,
      currentStep: draftDone ? 'match' : 'draft',
      lastPick: {
        team: 'ai',
        player: selectedPlayer,
      },
      draftMessage: null,
      isPlayingMatch: false,
      matchResult: null,
    });
  },
  playMatch: () => {
    const state = get();

    if (!state.draftComplete) {
      return;
    }

    if (state.mode === 'multiplayer') {
      const roomId = state.multiplayerSetup.roomId;
      const localSlot = state.multiplayerSetup.localSlot;

      if (!roomId || !localSlot) {
        return;
      }

      if (state.matchResult) {
        set({
          isPlayingMatch: false,
          currentStep: 'result',
        });
        return;
      }

      const localResult = simulateMatch(state.userTeam, state.aiTeam);

      set({
        isPlayingMatch: true,
      });

      void confirmMultiplayerMatchStart(roomId, localSlot, localResult)
        .then((room) => {
          set((currentState) => ({
            mode: 'multiplayer',
            rules: room.rules,
            multiplayerSetup: {
              ...currentState.multiplayerSetup,
              room,
              error: null,
            },
            ...hydrateMultiplayerRoom(room, currentState),
          }));
        })
        .catch((error) => {
          set((currentState) => ({
            isPlayingMatch: false,
            multiplayerSetup: {
              ...currentState.multiplayerSetup,
              error:
                error instanceof Error
                  ? error.message
                  : 'Impossible de lancer la simulation du match.',
            },
          }));
        });

      return;
    }

    set({
      isPlayingMatch: false,
      matchStartedAt: null,
      matchResult: simulateMatch(state.userTeam, state.aiTeam),
      currentStep: 'result',
    });
  },
  replayMatch: () => {
    const state = get();

    if (!state.draftComplete) {
      return;
    }

    set({
      isPlayingMatch: false,
      matchStartedAt: state.mode === 'multiplayer' ? state.matchStartedAt : null,
      matchResult: state.mode === 'multiplayer' ? state.matchResult : null,
      currentStep: 'match',
    });
  },
  resetDraft: () => {
    const state = get();

    set({
      ...buildLandingState(state.initialPlayers),
    });
  },
}));
