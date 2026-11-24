import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../src/shared/avatar';
import {
  MovementTxThrottle,
  RemoteAvatarFilter,
  selectLatestPresenceByUser,
  stepInterpolatedPosition,
} from '../../src/shared/realtime';
import type { MovementPacket, PresencePayload } from '../../src/shared/types';

function makePacket(overrides: Partial<MovementPacket> = {}): MovementPacket {
  return {
    worldId: 'world-1',
    userId: 'user-b',
    sessionId: 'sess-b',
    mapId: 'home',
    seq: 1,
    timestampMs: 1000,
    x: 120,
    y: 120,
    facing: 'down',
    anim: 'walk',
    ...overrides,
  };
}

describe('realtime movement throttling & remote filtering', () => {
  it('throttles movement sends to ~10Hz and stops idle spam', () => {
    const tx = new MovementTxThrottle(100);
    expect(tx.shouldEmit(0, 'walk', 'home')).toBe(true);
    expect(tx.shouldEmit(50, 'walk', 'home')).toBe(false);
    expect(tx.shouldEmit(105, 'walk', 'home')).toBe(true);
    // Emit one idle packet upon stopping, then suppress idle spam
    expect(tx.shouldEmit(120, 'idle', 'home')).toBe(true);
    expect(tx.shouldEmit(500, 'idle', 'home')).toBe(false);
    expect(tx.shouldEmit(1000, 'idle', 'home')).toBe(false);
    // Changing map always emits immediately
    expect(tx.shouldEmit(1010, 'idle', 'garden')).toBe(true);
  });

  it('drops self packets, wrong world, out-of-bounds, and out-of-order seq packets', () => {
    const filter = new RemoteAvatarFilter(5000);
    expect(filter.ingest(makePacket({ userId: 'user-a' }), 'user-a', 'world-1', 100)).toBeNull();
    expect(filter.ingest(makePacket({ worldId: 'world-other' }), 'user-a', 'world-1', 100)).toBeNull();
    expect(filter.ingest(makePacket({ x: 9999 }), 'user-a', 'world-1', 100)).toBeNull();

    const p2 = filter.ingest(makePacket({ seq: 2 }), 'user-a', 'world-1', 100);
    expect(p2?.seq).toBe(2);

    // Out-of-order / duplicate dropped
    expect(filter.ingest(makePacket({ seq: 1 }), 'user-a', 'world-1', 150)).toBeNull();
    expect(filter.ingest(makePacket({ seq: 2 }), 'user-a', 'world-1', 160)).toBeNull();

    const p3 = filter.ingest(makePacket({ seq: 3 }), 'user-a', 'world-1', 200);
    expect(p3?.seq).toBe(3);
  });

  it('tracks stale peers after timeout and interpolates positions smoothly', () => {
    const filter = new RemoteAvatarFilter(5000);
    filter.ingest(makePacket({ seq: 1 }), 'user-a', 'world-1', 1000);
    expect(filter.isStale('sess-b', 4000)).toBe(false);
    expect(filter.isStale('sess-b', 6001)).toBe(true);

    const next = stepInterpolatedPosition({ x: 100, y: 100 }, { x: 120, y: 100 }, 16);
    expect(next.x).toBeGreaterThan(100);
    expect(next.x).toBeLessThan(120);

    const snapped = stepInterpolatedPosition({ x: 119.9, y: 100 }, { x: 120, y: 100 }, 16);
    expect(snapped).toEqual({ x: 120, y: 100 });
  });

  it('deduplicates multi-device sessions by userId keeping latest updatedAtMs and excluding self', () => {
    const base: Omit<PresencePayload, 'userId' | 'sessionId' | 'mapId' | 'updatedAtMs'> = {
      nickname: 'Mây',
      avatarConfig: DEFAULT_AVATAR_PARTNER_A,
      tileX: 8,
      tileY: 9,
      facing: 'down',
    };

    const presences: PresencePayload[] = [
      { ...base, userId: 'user-a', sessionId: 'a-laptop', mapId: 'home', updatedAtMs: 1000 },
      { ...base, userId: 'user-a', sessionId: 'a-phone', mapId: 'garden', updatedAtMs: 2500 },
      {
        ...base,
        userId: 'user-b',
        nickname: 'Nắng',
        avatarConfig: DEFAULT_AVATAR_PARTNER_B,
        sessionId: 'b-phone',
        mapId: 'home',
        updatedAtMs: 2000,
      },
    ];

    const deduped = selectLatestPresenceByUser(presences, 'user-b');
    expect(deduped.size).toBe(1);
    expect(deduped.get('user-a')?.sessionId).toBe('a-phone');
    expect(deduped.get('user-a')?.mapId).toBe('garden');
    expect(deduped.has('user-b')).toBe(false);
  });
});
