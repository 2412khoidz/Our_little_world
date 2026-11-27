import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../src/shared/avatar';
import { createCoupleInvite, resolveInviteLocalExpiryMs } from '../../src/shared/couple/coupleProtocol';
import { ReconnectBackoff } from '../../src/shared/netcode/backoff';
import { RttJitterTracker, sanitizeSessionShort } from '../../src/shared/netcode/diagnostics';
import {
  MAX_EXTRAPOLATION_MS,
  RemoteMotionInterpolator,
  SNAP_DISTANCE_PX,
} from '../../src/shared/netcode/interpolation';
import { minigameEventEnvelopeSchema } from '../../src/shared/netcode/minigameContract';
import { BoundedOutboundQueue } from '../../src/shared/netcode/outboundQueue';
import { parseClientWsFrame } from '../../src/shared/netcode/protocol';
import { RemoteAvatarFilter, selectLatestPresenceByUser } from '../../src/shared/realtime';
import type { MovementPacket, PresencePayload } from '../../src/shared/types';

function makeMove(overrides: Partial<MovementPacket> = {}): MovementPacket {
  return {
    worldId: 'w-1',
    userId: 'user-b',
    sessionId: 'sess-b',
    mapId: 'home',
    seq: 1,
    timestampMs: 1000,
    x: 100,
    y: 120,
    facing: 'down',
    anim: 'walk',
    ...overrides,
  };
}

describe('netcode core primitives (Phase A/B/C/D)', () => {
  it('computes exponential backoff with bounded jitter and resets attempts', () => {
    const backoff = new ReconnectBackoff({
      minMs: 300,
      maxMs: 5000,
      factor: 2,
      jitter: 0.4,
      rng: () => 0.99,
    });
    const d1 = backoff.nextDelayMs();
    const d2 = backoff.nextDelayMs();
    const d3 = backoff.nextDelayMs();
    const d4 = backoff.nextDelayMs();
    const d5 = backoff.nextDelayMs();
    expect(d1).toBeGreaterThanOrEqual(300);
    expect(d1).toBeLessThanOrEqual(420);
    expect(d2).toBeGreaterThan(d1);
    expect(d3).toBeGreaterThan(d2);
    expect(d4).toBeLessThanOrEqual(5000);
    expect(d5).toBe(5000);
    expect(backoff.getAttempts()).toBe(5);
    backoff.reset();
    expect(backoff.getAttempts()).toBe(0);
    expect(backoff.nextDelayMs()).toBeLessThanOrEqual(420);
  });

  it('coalesces transient movement/presence updates and preserves reliable frames in bounded queue', () => {
    const q = new BoundedOutboundQueue<{ id: string }>(4);
    expect(q.enqueue({ id: 'm1' }, 'movement', true)).toBe(true);
    expect(q.enqueue({ id: 'm2' }, 'movement', true)).toBe(true);
    expect(q.enqueue({ id: 'r1' }, undefined, false)).toBe(true);
    expect(q.enqueue({ id: 'r2' }, undefined, false)).toBe(true);
    expect(q.enqueue({ id: 'r3' }, undefined, false)).toBe(true);
    expect(q.size()).toBe(4);
    // Adding a reliable event drops the transient movement before dropping reliable items
    expect(q.enqueue({ id: 'r4' }, undefined, false)).toBe(true);
    expect(q.size()).toBe(4);
    expect(q.droppedCount()).toBe(1);
    expect(q.drain().map((x) => x.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(q.size()).toBe(0);
  });

  it('tracks EWMA RTT and RFC 3550 jitter accurately', () => {
    const tracker = new RttJitterTracker();
    tracker.recordSample(-10);
    tracker.recordSample(Number.NaN);
    expect(tracker.getStats()).toEqual({ rttMs: null, smoothedRttMs: null, jitterMs: null });

    tracker.recordSample(80);
    expect(tracker.getStats()).toEqual({ rttMs: 80, smoothedRttMs: 80, jitterMs: 0 });
    tracker.recordSample(120);
    const s2 = tracker.getStats();
    expect(s2.rttMs).toBe(120);
    expect(s2.smoothedRttMs).toBe(90);
    expect(s2.jitterMs).toBe(3); // |120-80|/16 = 2.5 -> rounded 3
    tracker.reset();
    expect(tracker.getStats()).toEqual({ rttMs: null, smoothedRttMs: null, jitterMs: null });
  });

  it('interpolates remote movement smoothly under 100-300ms latency, bounds extrapolation, and settles cleanly', () => {
    const bounds = { maxW: 256, maxH: 192 };
    const interp = new RemoteMotionInterpolator(64, 64, 'home', 0);

    // Walk right at 80 px/s with 200ms sample cadence + jitter
    interp.pushSample(
      { x: 80, y: 64, vx: 80, vy: 0, anim: 'walk', mapId: 'home', seq: 1, receivedAtMonoMs: 200 },
      bounds,
    );
    for (let t = 216; t < 400; t += 16) {
      const res = interp.step(t, 16, 40, bounds);
      expect(res.moving).toBe(true);
      expect(res.x).toBeGreaterThanOrEqual(64);
      expect(res.x).toBeLessThanOrEqual(80 + (80 * MAX_EXTRAPOLATION_MS) / 1000 + 1);
    }

    // Extrapolation stays bounded even if packet stalls for 1000ms
    const stalled = interp.step(1400, 16, 80, bounds);
    expect(stalled.x).toBeLessThanOrEqual(80 + (80 * MAX_EXTRAPOLATION_MS) / 1000);

    // Stopped idle packet settles cleanly without overshoot
    interp.pushSample(
      { x: 108, y: 64, vx: 0, vy: 0, anim: 'idle', mapId: 'home', seq: 2, receivedAtMonoMs: 1410 },
      bounds,
    );
    let lastX = interp.getPosition().x;
    for (let t = 1426; t <= 2200; t += 16) {
      const stepRes = interp.step(t, 16, 20, bounds);
      expect(stepRes.x).toBeGreaterThanOrEqual(lastX - 0.01);
      expect(stepRes.x).toBeLessThanOrEqual(108);
      lastX = stepRes.x;
    }
    expect(interp.getPosition()).toEqual({ x: 108, y: 64 });

    // Large teleport (> SNAP_DISTANCE_PX) or map transition snaps immediately
    interp.pushSample(
      {
        x: 108 + SNAP_DISTANCE_PX + 20,
        y: 64,
        anim: 'idle',
        mapId: 'home',
        seq: 3,
        receivedAtMonoMs: 2210,
      },
      bounds,
    );
    expect(interp.getPosition().x).toBe(108 + SNAP_DISTANCE_PX + 20);
  });

  it('prefers server presenceSeq over skewed client wall clocks', () => {
    const base: Omit<PresencePayload, 'userId' | 'sessionId' | 'mapId' | 'updatedAtMs' | 'presenceSeq'> = {
      nickname: 'Nắng',
      avatarConfig: DEFAULT_AVATAR_PARTNER_B,
      tileX: 5,
      tileY: 5,
      facing: 'down',
    };
    const oldSkewed: PresencePayload = {
      ...base,
      userId: 'nang',
      sessionId: 'sess-old',
      mapId: 'home',
      updatedAtMs: Date.now() + 3_600_000, // 1h ahead clock skew!
      presenceSeq: 3,
    };
    const newerServerAuth: PresencePayload = {
      ...base,
      userId: 'nang',
      sessionId: 'sess-new',
      mapId: 'farm',
      updatedAtMs: Date.now() - 60_000, // behind clock
      presenceSeq: 4,
    };
    const picked = selectLatestPresenceByUser([oldSkewed, newerServerAuth]);
    expect(picked.get('nang')?.sessionId).toBe('sess-new');
    expect(picked.get('nang')?.mapId).toBe('farm');
  });

  it('allows authoritative snapshot replay in RemoteAvatarFilter while dropping normal duplicates', () => {
    const filter = new RemoteAvatarFilter(5000);
    const p5 = filter.ingest(makeMove({ seq: 5 }), 'user-a', 'w-1', 100);
    expect(p5?.seq).toBe(5);
    expect(filter.ingest(makeMove({ seq: 5 }), 'user-a', 'w-1', 110)).toBeNull();
    expect(
      filter.ingest(makeMove({ seq: 5, x: 140, isSnapshotReplay: true }), 'user-a', 'w-1', 120)?.x,
    ).toBe(140);
    expect(
      filter.ingest(makeMove({ seq: 4, isSnapshotReplay: true }), 'user-a', 'w-1', 130),
    ).toBeNull();
  });

  it('computes couple invite expiry from local clock + ttlMs and validates WS/minigame schemas', () => {
    const inv = createCoupleInvite({
      inviteId: 'inv-1',
      kind: 'hug',
      worldId: 'w1',
      fromUserId: 'may',
      fromSessionId: 's1',
      toUserId: 'nang',
      mapId: 'home',
      anchorX: 100,
      anchorY: 100,
      nowMs: 1_000_000_000_000, // arbitrarily skewed sender clock
    });
    const receiverNow = 1_700_000_000_000;
    expect(resolveInviteLocalExpiryMs(inv.ttlMs, receiverNow)).toBe(receiverNow + 15_000);

    expect(sanitizeSessionShort('abcdef123456?token=secret')).toBe('abcd..cret');
    expect(sanitizeSessionShort('')).toBe('none');

    const validPing = parseClientWsFrame({ type: 'ping', clientSentMonoMs: 123.4 });
    expect(validPing?.type).toBe('ping');
    expect(parseClientWsFrame({ type: 'unknown' })).toBeNull();

    expect(
      minigameEventEnvelopeSchema.safeParse({
        type: 'MINIGAME_EVENT',
        gameId: 'billiards',
        matchId: 'm1',
        worldId: 'w1',
        actorUserId: 'u1',
        sessionId: 's1',
        seq: 1,
        stateVersion: 2,
        payload: { shot: 1 },
      }).success,
    ).toBe(true);
    expect(DEFAULT_AVATAR_PARTNER_A.hairStyle).toBeTruthy();
  });
});
