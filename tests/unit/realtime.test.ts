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
  const position = { x: 32, y: 32, facing: 'down' } as const;

  it('caps ordinary sends at 8Hz and measures cumulative Euclidean delta from the last send', () => {
    const tx = new MovementTxThrottle();
    expect(tx.shouldEmit(0, 'walk', 'home', position)).toBe(true);
    expect(tx.shouldEmit(124, 'walk', 'home', { ...position, x: 36 })).toBe(false);
    expect(tx.shouldEmit(125, 'walk', 'home', { ...position, x: 33 })).toBe(false);
    expect(tx.shouldEmit(130, 'walk', 'home', { ...position, x: 33, y: 33 })).toBe(false);
    expect(tx.shouldEmit(135, 'walk', 'home', { ...position, x: 33.25, y: 33.6 })).toBe(true);
    expect(tx.shouldEmit(260, 'walk', 'home', { ...position, x: 34.25, y: 33.6 })).toBe(false);
    expect(tx.shouldEmit(265, 'walk', 'home', { ...position, x: 35.25, y: 33.6 })).toBe(true);
  });

  it('sends a direction-only update on cadence and sends idle and map changes once immediately', () => {
    const tx = new MovementTxThrottle();
    const turned = { ...position, facing: 'right' } as const;
    expect(tx.shouldEmit(0, 'walk', 'home', position)).toBe(true);
    expect(tx.shouldEmit(124, 'walk', 'home', turned)).toBe(false);
    expect(tx.shouldEmit(125, 'walk', 'home', turned)).toBe(true);
    expect(tx.shouldEmit(126, 'idle', 'home', turned)).toBe(true);
    expect(tx.shouldEmit(127, 'idle', 'home', turned)).toBe(false);
    expect(tx.shouldEmit(128, 'idle', 'garden', position)).toBe(true);
    expect(tx.shouldEmit(129, 'idle', 'garden', position)).toBe(false);
    expect(tx.shouldEmit(252, 'walk', 'garden', turned)).toBe(false);
    expect(tx.shouldEmit(253, 'walk', 'garden', turned)).toBe(true);
  });

  it('sends the resting position after a short movement and preserves sequence across reconnect', () => {
    const tx = new MovementTxThrottle();
    const moved = { ...position, x: 33 };
    expect(tx.shouldEmit(0, 'idle', 'home', position)).toBe(true);
    expect(tx.nextSeq()).toBe(1);
    expect(tx.shouldEmit(40, 'walk', 'home', moved)).toBe(false);
    expect(tx.shouldEmit(55, 'idle', 'home', moved)).toBe(true);
    expect(tx.nextSeq()).toBe(2);
    expect(tx.shouldEmit(56, 'idle', 'home', moved)).toBe(false);

    tx.reset();
    expect(tx.shouldEmit(57, 'idle', 'home', moved)).toBe(true);
    expect(tx.nextSeq()).toBe(3);
    expect(tx.shouldEmit(58, 'idle', 'home', moved)).toBe(false);
    expect(tx.shouldEmit(181, 'walk', 'home', { ...position, x: 40 })).toBe(false);
    expect(tx.shouldEmit(182, 'walk', 'home', { ...position, x: 40 })).toBe(true);
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

  it('interpolates toward newer targets without overshoot during irregular arrivals and settles at idle', () => {
    const filter = new RemoteAvatarFilter();
    const deliveries = [
      [0, makePacket({ seq: 1, x: 115 })],
      [96, makePacket({ seq: 3, x: 135 })],
      [177, makePacket({ seq: 2, x: 125 })],
      [233, makePacket({ seq: 4, x: 141, anim: 'idle' })],
    ] as const;
    let current = { x: 100, y: 120 };
    let target = current;
    let nextDelivery = 0;
    for (let now = 0; now < 1000; now += 16) {
      const delivery = deliveries[nextDelivery];
      if (delivery && delivery[0] <= now) {
        target = filter.ingest(delivery[1], 'user-a', 'world-1', now) ?? target;
        nextDelivery++;
      }
      const next = stepInterpolatedPosition(current, target, 16);
      expect(next.x).toBeGreaterThanOrEqual(current.x);
      expect(next.x).toBeLessThanOrEqual(target.x);
      current = next;
    }
    expect(current).toEqual({ x: 141, y: 120 });
  });

  it('tracks each device sequence independently so a handoff can use its own position', () => {
    const filter = new RemoteAvatarFilter();
    const phone = makePacket({ seq: 80, sessionId: 'phone' });
    const laptop = makePacket({ seq: 1, sessionId: 'laptop', x: 100 });
    expect(filter.ingest(phone, 'user-a', 'world-1', 100)).toEqual(phone);
    expect(filter.ingest(laptop, 'user-a', 'world-1', 101)).toEqual(laptop);
    expect(filter.getLatestPacket('phone')).toEqual(phone);
    expect(filter.getLatestPacket('laptop')).toEqual(laptop);
    filter.removeSession('phone');
    expect(filter.getLatestPacket('phone')).toBeUndefined();
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
