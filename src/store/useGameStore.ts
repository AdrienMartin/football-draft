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
import { simulateMatch, type MatchResult } from '../lib/game/simulation';
import type { Player } from '../types/player';

type GameState = {
  currentStep: AppStep;
  initialPlayers: Player[];
  draftPool: Player[];
  availablePlayers: Player[];
  userTeam: Player[];
  aiTeam: Player[];
  rules: DraftRules;
  currentTurn: DraftTurn;
  draftComplete: boolean;
  lastPick: {
    team: DraftTurn;
    player: Player;
  } | null;
  draftMessage: string | null;
  matchResult: MatchResult | null;
  loadPlayers: (players: Player[]) => void;
  openRules: () => void;
  startQuickDraft: () => void;
  startDraft: (rules?: DraftRules) => void;
  userPickPlayer: (playerId: number) => void;
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
    lastPick: null,
    draftMessage: null,
    matchResult: null,
  };
}

function buildLandingState(players: Player[]) {
  return {
    currentStep: 'landing' as AppStep,
    draftPool: [],
    availablePlayers: [],
    userTeam: [],
    aiTeam: [],
    rules: DEFAULT_DRAFT_RULES,
    currentTurn: 'user' as DraftTurn,
    draftComplete: false,
    lastPick: null,
    draftMessage: null,
    matchResult: null,
    initialPlayers: players,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  currentStep: 'landing',
  initialPlayers: [],
  draftPool: [],
  availablePlayers: [],
  userTeam: [],
  aiTeam: [],
  rules: DEFAULT_DRAFT_RULES,
  currentTurn: 'user',
  draftComplete: false,
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
    });
  },
  startQuickDraft: () => {
    const state = get();

    if (state.initialPlayers.length === 0) {
      return;
    }

    set({
      initialPlayers: state.initialPlayers,
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
      ...buildDraftState(filteredPlayers, rules),
    });
  },
  userPickPlayer: (playerId) => {
    const state = get();

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
      matchResult: null,
    });
  },
  aiPickTurn: () => {
    const state = get();

    if (state.currentTurn !== 'ai' || state.draftComplete) {
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
      matchResult: null,
    });
  },
  playMatch: () => {
    const state = get();

    if (!state.draftComplete) {
      return;
    }

    set({
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
      matchResult: null,
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
