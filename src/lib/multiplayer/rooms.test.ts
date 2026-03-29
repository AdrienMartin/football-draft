import { describe, expect, it, vi } from 'vitest';
import type { MultiplayerRoom } from './types';
import {
  getDisconnectedPlayerSlot,
  isMultiplayerRoomExpired,
  isPlayerConnectionStale,
} from './rooms';

function buildRoom(overrides: Partial<MultiplayerRoom> = {}): MultiplayerRoom {
  return {
    id: 'room-1',
    status: 'waiting',
    hostName: 'Host',
    guestName: 'Guest',
    hostConnectedAt: new Date('2026-03-29T10:00:00.000Z').toISOString(),
    guestConnectedAt: new Date('2026-03-29T10:00:00.000Z').toISOString(),
    rules: {
      league: null,
      nationality: null,
      maxTeamValue: null,
    },
    draftState: null,
    matchReady: null,
    matchResult: null,
    matchStartedAt: null,
    createdAt: new Date('2026-03-29T10:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-03-29T10:00:00.000Z').toISOString(),
    ...overrides,
  };
}

describe('multiplayer room timing', () => {
  it('detects stale player connections from the heartbeat timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T10:00:20.000Z'));

    expect(isPlayerConnectionStale(null)).toBe(true);
    expect(isPlayerConnectionStale(new Date('2026-03-29T10:00:18.000Z').toISOString())).toBe(
      false,
    );
    expect(isPlayerConnectionStale(new Date('2026-03-29T10:00:00.000Z').toISOString())).toBe(
      true,
    );

    vi.useRealTimers();
  });

  it('flags the other player as disconnected from the local perspective only when stale', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T10:00:20.000Z'));

    const activeRoom = buildRoom({
      hostConnectedAt: new Date('2026-03-29T10:00:19.000Z').toISOString(),
      guestConnectedAt: new Date('2026-03-29T10:00:18.000Z').toISOString(),
    });

    const staleGuestRoom = buildRoom({
      hostConnectedAt: new Date('2026-03-29T10:00:19.000Z').toISOString(),
      guestConnectedAt: new Date('2026-03-29T10:00:00.000Z').toISOString(),
    });

    expect(getDisconnectedPlayerSlot(activeRoom, 'host')).toBeNull();
    expect(getDisconnectedPlayerSlot(staleGuestRoom, 'host')).toBe('guest');
    expect(getDisconnectedPlayerSlot(staleGuestRoom, 'guest')).toBeNull();
    expect(getDisconnectedPlayerSlot(staleGuestRoom, null)).toBeNull();

    vi.useRealTimers();
  });

  it('expires old rooms based on their latest useful activity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T18:30:00.000Z'));

    const activeRoom = buildRoom({
      status: 'draft',
      updatedAt: new Date('2026-03-29T14:00:00.000Z').toISOString(),
    });
    const expiredActiveRoom = buildRoom({
      status: 'draft',
      updatedAt: new Date('2026-03-29T11:00:00.000Z').toISOString(),
    });
    const freshFinishedRoom = buildRoom({
      status: 'finished',
      matchStartedAt: new Date('2026-03-29T17:30:00.000Z').toISOString(),
      updatedAt: new Date('2026-03-29T17:40:00.000Z').toISOString(),
    });
    const expiredFinishedRoom = buildRoom({
      status: 'finished',
      matchStartedAt: new Date('2026-03-29T16:30:00.000Z').toISOString(),
      updatedAt: new Date('2026-03-29T16:35:00.000Z').toISOString(),
    });

    expect(isMultiplayerRoomExpired(activeRoom)).toBe(false);
    expect(isMultiplayerRoomExpired(expiredActiveRoom)).toBe(true);
    expect(isMultiplayerRoomExpired(freshFinishedRoom)).toBe(false);
    expect(isMultiplayerRoomExpired(expiredFinishedRoom)).toBe(true);

    vi.useRealTimers();
  });
});
