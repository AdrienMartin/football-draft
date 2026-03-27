import { canDraftPlayer, DRAFT_TEAM_SIZE, sortPlayersForDraft } from '../game/draft';
import { applyDraftRules, canAddPlayerWithinBudget, type DraftRules } from '../game/rules';
import type { MatchResult } from '../game/simulation';
import { supabase } from '../supabase/client';
import type { Player } from '../../types/player';
import { toRoomMatchResult } from './matchMapping';
import type {
  MultiplayerDraftState,
  MultiplayerMatchReadyState,
  MultiplayerMatchResult,
  MultiplayerPlayerSlot,
  MultiplayerRoom,
} from './types';

type CreateMultiplayerRoomInput = {
  hostName: string;
  rules: DraftRules;
};

type MultiplayerRoomRow = {
  id: string;
  status: MultiplayerRoom['status'];
  host_name: string | null;
  guest_name: string | null;
  host_connected_at: string | null;
  guest_connected_at: string | null;
  rules: DraftRules;
  draft_state: MultiplayerDraftState | null;
  match_ready: MultiplayerMatchReadyState | null;
  match_result: MultiplayerMatchResult | null;
  match_started_at: string | null;
  created_at: string;
};

const MATCH_START_DELAY_MS = 2500;
const PLAYER_STALE_MS = 12000;

function toMultiplayerErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';

  if (/failed to fetch|network|load failed|fetch/i.test(message)) {
    return 'Impossible de contacter Supabase pour le moment. Vérifie ta connexion puis réessaie.';
  }

  return message || fallback;
}

function buildInviteLink(roomId: string) {
  if (typeof window === 'undefined') {
    return `?roomId=${roomId}`;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('roomId', roomId);
  return url.toString();
}

function mapRoomRow(row: MultiplayerRoomRow): MultiplayerRoom {
  return {
    id: row.id,
    status: row.status,
    hostName: row.host_name,
    guestName: row.guest_name,
    hostConnectedAt: row.host_connected_at,
    guestConnectedAt: row.guest_connected_at,
    rules: row.rules,
    draftState: row.draft_state,
    matchReady: row.match_ready,
    matchResult: row.match_result,
    matchStartedAt: row.match_started_at,
    createdAt: row.created_at,
  };
}

async function fetchRoomRow(roomId: string) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .select(
      'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, match_result, match_started_at, created_at',
    )
    .eq('id', roomId)
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Room introuvable.'));
  }

  return data as MultiplayerRoomRow;
}

function buildInitialDraftState(players: Player[]): MultiplayerDraftState {
  return {
    availablePlayerIds: sortPlayersForDraft(players).map((player) => player.id),
    hostTeamIds: [],
    guestTeamIds: [],
    currentTurn: 'host',
    lastPick: null,
    draftComplete: false,
  };
}

function getTeamIdsForSlot(draftState: MultiplayerDraftState, slot: MultiplayerPlayerSlot) {
  return slot === 'host' ? draftState.hostTeamIds : draftState.guestTeamIds;
}

function isMultiplayerDraftComplete(draftState: MultiplayerDraftState) {
  return (
    draftState.hostTeamIds.length >= DRAFT_TEAM_SIZE &&
    draftState.guestTeamIds.length >= DRAFT_TEAM_SIZE
  );
}

function getOtherSlot(slot: MultiplayerPlayerSlot): MultiplayerPlayerSlot {
  return slot === 'host' ? 'guest' : 'host';
}

export async function createMultiplayerRoom({
  hostName,
  rules,
}: CreateMultiplayerRoomInput) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const roomId = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .insert({
      id: roomId,
      status: 'waiting',
      host_name: hostName,
      guest_name: null,
      host_connected_at: now,
      guest_connected_at: null,
      rules,
      draft_state: null,
      match_ready: null,
      match_result: null,
      match_started_at: null,
    })
    .select(
      'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, match_result, match_started_at, created_at',
    )
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Impossible de créer la room.'));
  }

  return {
    room: mapRoomRow(data as MultiplayerRoomRow),
    inviteLink: buildInviteLink(roomId),
  };
}

export async function getMultiplayerRoom(roomId: string) {
  const roomRow = await fetchRoomRow(roomId);
  return mapRoomRow(roomRow);
}

export async function joinMultiplayerRoom(roomId: string, guestName: string) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const room = await getMultiplayerRoom(roomId);

  if (room.guestName && room.guestName.trim().length > 0) {
    throw new Error('Cette room est déjà pleine.');
  }

  const nextStatus = room.hostName ? 'ready' : 'waiting';
  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .update({
      guest_name: guestName,
      guest_connected_at: new Date().toISOString(),
      status: nextStatus,
    })
    .eq('id', roomId)
    .select(
      'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, match_result, match_started_at, created_at',
    )
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Impossible de rejoindre la room.'));
  }

  return mapRoomRow(data as MultiplayerRoomRow);
}

export async function startMultiplayerDraft(roomId: string, players: Player[]) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const room = await getMultiplayerRoom(roomId);

  if (!room.hostName || !room.guestName) {
    throw new Error('La draft ne peut pas commencer tant que deux joueurs ne sont pas présents.');
  }

  const draftPool = applyDraftRules(players, room.rules);

  if (draftPool.length < DRAFT_TEAM_SIZE * 2) {
    throw new Error('Pas assez de joueurs disponibles pour lancer la draft.');
  }

  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .update({
      status: 'draft',
      draft_state: buildInitialDraftState(draftPool),
      match_ready: null,
      match_result: null,
      match_started_at: null,
    })
    .eq('id', roomId)
    .select(
      'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, match_result, match_started_at, created_at',
    )
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Impossible de lancer la draft.'));
  }

  return mapRoomRow(data as MultiplayerRoomRow);
}

export async function makeMultiplayerPick(
  roomId: string,
  slot: MultiplayerPlayerSlot,
  playerId: number,
  players: Player[],
) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const room = await getMultiplayerRoom(roomId);

  if (room.status !== 'draft' || !room.draftState) {
    throw new Error('La draft n’est pas active.');
  }

  const draftState = room.draftState;

  if (draftState.currentTurn !== slot) {
    throw new Error('Ce n’est pas ton tour.');
  }

  if (!draftState.availablePlayerIds.includes(playerId)) {
    throw new Error('Ce joueur n’est plus disponible.');
  }

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const candidate = playerMap.get(playerId);

  if (!candidate) {
    throw new Error('Joueur introuvable.');
  }

  const teamIds = getTeamIdsForSlot(draftState, slot);
  const teamPlayers = teamIds
    .map((id) => playerMap.get(id))
    .filter((player): player is Player => Boolean(player));

  if (!canDraftPlayer(teamPlayers, candidate, room.rules.maxTeamValue)) {
    throw new Error('Ce choix ne respecte pas les règles de draft.');
  }

  if (!canAddPlayerWithinBudget(teamPlayers, candidate, room.rules.maxTeamValue)) {
    throw new Error('Ce choix dépasse le budget autorisé.');
  }

  const nextHostTeamIds =
    slot === 'host' ? [...draftState.hostTeamIds, playerId] : draftState.hostTeamIds;
  const nextGuestTeamIds =
    slot === 'guest' ? [...draftState.guestTeamIds, playerId] : draftState.guestTeamIds;

  const nextDraftState: MultiplayerDraftState = {
    availablePlayerIds: draftState.availablePlayerIds.filter((id) => id !== playerId),
    hostTeamIds: nextHostTeamIds,
    guestTeamIds: nextGuestTeamIds,
    currentTurn: slot === 'host' ? 'guest' : 'host',
    lastPick: {
      team: slot,
      playerId,
    },
    draftComplete: false,
  };

  const draftComplete = isMultiplayerDraftComplete(nextDraftState);
  nextDraftState.draftComplete = draftComplete;

  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .update({
      status: draftComplete ? 'match' : 'draft',
      draft_state: nextDraftState,
      match_ready: draftComplete ? { host: false, guest: false } : null,
      match_result: null,
      match_started_at: null,
    })
    .eq('id', roomId)
    .eq('status', 'draft')
    .select(
      'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, match_result, match_started_at, created_at',
    )
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Impossible d’enregistrer ce choix.'));
  }

  return mapRoomRow(data as MultiplayerRoomRow);
}

export async function confirmMultiplayerMatchStart(
  roomId: string,
  slot: MultiplayerPlayerSlot,
  result: MatchResult,
) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const room = await getMultiplayerRoom(roomId);

  if (room.matchResult) {
    return room;
  }

  if (room.status !== 'match') {
    throw new Error('Le match n’est pas prêt à être lancé.');
  }

  const currentReady = room.matchReady ?? { host: false, guest: false };
  const nextReady: MultiplayerMatchReadyState = {
    ...currentReady,
    [slot]: true,
  };

  if (!nextReady[getOtherSlot(slot)]) {
    const { data, error } = await supabase
      .from('multiplayer_rooms')
      .update({
        match_ready: nextReady,
      })
      .eq('id', roomId)
      .select(
        'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, match_result, match_started_at, created_at',
      )
      .single();

    if (error || !data) {
      throw new Error(
        toMultiplayerErrorMessage(
          error,
          'Impossible d’enregistrer ton accord pour lancer le match.',
        ),
      );
    }

    return mapRoomRow(data as MultiplayerRoomRow);
  }

  const roomResult = toRoomMatchResult(result, slot);
  const matchStartedAt = new Date(Date.now() + MATCH_START_DELAY_MS).toISOString();
  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .update({
      status: 'finished',
      match_ready: nextReady,
      match_result: roomResult,
      match_started_at: matchStartedAt,
    })
    .eq('id', roomId)
    .select(
      'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, match_result, match_started_at, created_at',
    )
    .single();

  if (error || !data) {
    throw new Error(
      toMultiplayerErrorMessage(error, 'Impossible de lancer la simulation du match.'),
    );
  }

  return mapRoomRow(data as MultiplayerRoomRow);
}

export async function heartbeatMultiplayerRoom(
  roomId: string,
  slot: MultiplayerPlayerSlot,
) {
  if (!supabase) {
    throw new Error('Supabase n’est pas configuré.');
  }

  const payload =
    slot === 'host'
      ? { host_connected_at: new Date().toISOString() }
      : { guest_connected_at: new Date().toISOString() };

  const { error } = await supabase.from('multiplayer_rooms').update(payload).eq('id', roomId);

  if (error) {
    throw new Error(
      toMultiplayerErrorMessage(error, 'Impossible de mettre à jour l’état de connexion.'),
    );
  }
}

export function getDisconnectedPlayerSlot(
  room: MultiplayerRoom,
  localSlot: MultiplayerPlayerSlot | null,
) {
  if (!localSlot) {
    return null;
  }

  const otherSlot = getOtherSlot(localSlot);
  const otherName = otherSlot === 'host' ? room.hostName : room.guestName;
  const otherConnectedAt = otherSlot === 'host' ? room.hostConnectedAt : room.guestConnectedAt;

  if (!otherName || !otherConnectedAt) {
    return null;
  }

  const lastSeen = new Date(otherConnectedAt).getTime();

  if (Number.isNaN(lastSeen)) {
    return null;
  }

  return Date.now() - lastSeen > PLAYER_STALE_MS ? otherSlot : null;
}

export function subscribeToMultiplayerRoom(
  roomId: string,
  onRoomChange: (room: MultiplayerRoom) => void,
  onConnectionIssue?: (message: string | null) => void,
) {
  const client = supabase;

  if (!client) {
    return () => {};
  }

  let lastSnapshot = '';
  let disposed = false;

  function pushRoom(nextRoom: MultiplayerRoom) {
    const nextSnapshot = JSON.stringify(nextRoom);

    if (nextSnapshot === lastSnapshot) {
      return;
    }

    lastSnapshot = nextSnapshot;
    onConnectionIssue?.(null);
    onRoomChange(nextRoom);
  }

  const channel = client
    .channel(`multiplayer-room-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'multiplayer_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        const next = payload.new;

        if (!next || Array.isArray(next)) {
          return;
        }

        pushRoom(mapRoomRow(next as MultiplayerRoomRow));
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onConnectionIssue?.(null);
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onConnectionIssue?.(
          'Connexion temps réel indisponible pour le moment. Tentative de reconnexion...',
        );
      }
    });

  const pollRoom = window.setInterval(async () => {
    if (disposed) {
      return;
    }

    try {
      const room = await getMultiplayerRoom(roomId);
      pushRoom(room);
    } catch (error) {
      onConnectionIssue?.(
        toMultiplayerErrorMessage(
          error,
          'Impossible de récupérer la room pour le moment. Vérifie ta connexion.',
        ),
      );
    }
  }, 2000);

  return () => {
    disposed = true;
    window.clearInterval(pollRoom);
    void client.removeChannel(channel);
  };
}
