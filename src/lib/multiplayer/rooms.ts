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
  MultiplayerRematchReadyState,
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
  rematch_ready: MultiplayerRematchReadyState | null;
  match_result: MultiplayerMatchResult | null;
  match_started_at: string | null;
  created_at: string;
  updated_at: string;
};

const MATCH_START_DELAY_MS = 2500;
const PLAYER_STALE_MS = 12000;
const ROOM_ACTIVE_EXPIRATION_MS = 1000 * 60 * 60 * 6;
const ROOM_FINISHED_EXPIRATION_MS = 1000 * 60 * 90;
const ROOM_MEMBERSHIP_STORAGE_KEY = 'football-draft-room-memberships';
const ROOM_SELECT_QUERY =
  'id, status, host_name, guest_name, host_connected_at, guest_connected_at, rules, draft_state, match_ready, rematch_ready, match_result, match_started_at, created_at, updated_at';

type StoredRoomMembership = {
  slot: MultiplayerPlayerSlot;
  name: string;
  savedAt: string;
};

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

function readStoredRoomMemberships() {
  if (typeof window === 'undefined') {
    return {} as Record<string, StoredRoomMembership>;
  }

  try {
    const raw = window.localStorage.getItem(ROOM_MEMBERSHIP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredRoomMembership>) : {};
  } catch {
    return {} as Record<string, StoredRoomMembership>;
  }
}

function writeStoredRoomMemberships(memberships: Record<string, StoredRoomMembership>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ROOM_MEMBERSHIP_STORAGE_KEY, JSON.stringify(memberships));
}

export function storeRoomMembership(
  roomId: string,
  slot: MultiplayerPlayerSlot,
  name: string,
) {
  const memberships = readStoredRoomMemberships();
  memberships[roomId] = {
    slot,
    name,
    savedAt: new Date().toISOString(),
  };
  writeStoredRoomMemberships(memberships);
}

export function getStoredRoomMembership(roomId: string) {
  const memberships = readStoredRoomMemberships();
  return memberships[roomId] ?? null;
}

export function isMultiplayerRoomExpired(
  room: Pick<MultiplayerRoom, 'status' | 'matchStartedAt' | 'updatedAt' | 'createdAt'>,
) {
  const reference = room.matchStartedAt ?? room.updatedAt ?? room.createdAt;
  const timestamp = new Date(reference).getTime();
  const safeTimestamp = Number.isNaN(timestamp) ? 0 : timestamp;
  const elapsed = Date.now() - safeTimestamp;
  const expirationMs =
    room.status === 'finished' ? ROOM_FINISHED_EXPIRATION_MS : ROOM_ACTIVE_EXPIRATION_MS;

  return elapsed > expirationMs;
}

function isRoomExpired(room: MultiplayerRoomRow) {
  return isMultiplayerRoomExpired({
    status: room.status,
    matchStartedAt: room.match_started_at,
    updatedAt: room.updated_at,
    createdAt: room.created_at,
  });
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
    rematchReady: row.rematch_ready,
    matchResult: row.match_result,
    matchStartedAt: row.match_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchRoomRow(roomId: string) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .select(ROOM_SELECT_QUERY)
    .eq('id', roomId)
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Room introuvable.'));
  }

  const room = data as MultiplayerRoomRow;

  if (isRoomExpired(room)) {
    throw new Error('Cette room a expiré. Crée une nouvelle partie pour rejouer.');
  }

  return room;
}

function buildInitialDraftState(players: Player[]): MultiplayerDraftState {
  const starter: MultiplayerPlayerSlot = Math.random() < 0.5 ? 'host' : 'guest';

  return {
    availablePlayerIds: sortPlayersForDraft(players).map((player) => player.id),
    hostTeamIds: [],
    guestTeamIds: [],
    starter,
    currentTurn: starter,
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
    throw new Error("Supabase n'est pas configuré.");
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
      rematch_ready: null,
      match_result: null,
      match_started_at: null,
    })
    .select(ROOM_SELECT_QUERY)
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
    throw new Error("Supabase n'est pas configuré.");
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
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Impossible de rejoindre la room.'));
  }

  const joinedRoom = mapRoomRow(data as MultiplayerRoomRow);
  storeRoomMembership(roomId, 'guest', guestName);
  return joinedRoom;
}

export async function startMultiplayerDraft(roomId: string, players: Player[]) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
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
      rematch_ready: null,
      match_result: null,
      match_started_at: null,
    })
    .eq('id', roomId)
    .select(ROOM_SELECT_QUERY)
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
    throw new Error("Supabase n'est pas configuré.");
  }

  const room = await getMultiplayerRoom(roomId);

  if (room.status !== 'draft' || !room.draftState) {
    throw new Error("La draft n'est pas active.");
  }

  const draftState = room.draftState;

  if (draftState.currentTurn !== slot) {
    throw new Error("Ce n'est pas ton tour.");
  }

  if (!draftState.availablePlayerIds.includes(playerId)) {
    throw new Error("Ce joueur n'est plus disponible.");
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
    starter: draftState.starter ?? draftState.currentTurn,
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
      rematch_ready: null,
      match_result: null,
      match_started_at: null,
    })
    .eq('id', roomId)
    .eq('status', 'draft')
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, "Impossible d'enregistrer ce choix."));
  }

  return mapRoomRow(data as MultiplayerRoomRow);
}

export async function confirmMultiplayerMatchStart(
  roomId: string,
  slot: MultiplayerPlayerSlot,
  result: MatchResult,
) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const room = await getMultiplayerRoom(roomId);

  if (room.matchResult) {
    return room;
  }

  if (room.status !== 'match') {
    throw new Error("Le match n'est pas prêt à être lancé.");
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
        rematch_ready: null,
      })
      .eq('id', roomId)
      .select(ROOM_SELECT_QUERY)
      .single();

    if (error || !data) {
      throw new Error(
        toMultiplayerErrorMessage(error, "Impossible d'enregistrer ton accord pour lancer le match."),
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
      rematch_ready: null,
      match_result: roomResult,
      match_started_at: matchStartedAt,
    })
    .eq('id', roomId)
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error || !data) {
    throw new Error(toMultiplayerErrorMessage(error, 'Impossible de lancer la simulation du match.'));
  }

  return mapRoomRow(data as MultiplayerRoomRow);
}

export async function requestMultiplayerRematch(
  roomId: string,
  slot: MultiplayerPlayerSlot,
) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const room = await getMultiplayerRoom(roomId);

  if (room.status !== 'finished' || !room.matchResult || !room.draftState) {
    throw new Error('La revanche n’est pas disponible pour le moment.');
  }

  const currentReady = room.rematchReady ?? { host: false, guest: false };
  const nextReady: MultiplayerRematchReadyState = {
    ...currentReady,
    [slot]: true,
  };

  if (!nextReady[getOtherSlot(slot)]) {
    const { data, error } = await supabase
      .from('multiplayer_rooms')
      .update({
        rematch_ready: nextReady,
      })
      .eq('id', roomId)
      .select(ROOM_SELECT_QUERY)
      .single();

    if (error || !data) {
      throw new Error(
        toMultiplayerErrorMessage(error, "Impossible d'enregistrer ta demande de revanche."),
      );
    }

    return mapRoomRow(data as MultiplayerRoomRow);
  }

  const { data, error } = await supabase
    .from('multiplayer_rooms')
    .update({
      status: 'match',
      match_ready: { host: false, guest: false },
      rematch_ready: null,
      match_result: null,
      match_started_at: null,
    })
    .eq('id', roomId)
    .select(ROOM_SELECT_QUERY)
    .single();

  if (error || !data) {
    throw new Error(
      toMultiplayerErrorMessage(error, 'Impossible de préparer la revanche.'),
    );
  }

  return mapRoomRow(data as MultiplayerRoomRow);
}

export async function heartbeatMultiplayerRoom(
  roomId: string,
  slot: MultiplayerPlayerSlot,
) {
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const payload =
    slot === 'host'
      ? { host_connected_at: new Date().toISOString() }
      : { guest_connected_at: new Date().toISOString() };

  const { error } = await supabase.from('multiplayer_rooms').update(payload).eq('id', roomId);

  if (error) {
    throw new Error(
      toMultiplayerErrorMessage(error, "Impossible de mettre à jour l'état de connexion."),
    );
  }
}

export function isPlayerConnectionStale(connectedAt: string | null) {
  if (!connectedAt) {
    return true;
  }

  const lastSeen = new Date(connectedAt).getTime();

  if (Number.isNaN(lastSeen)) {
    return true;
  }

  return Date.now() - lastSeen > PLAYER_STALE_MS;
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

  return isPlayerConnectionStale(otherConnectedAt) ? otherSlot : null;
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
