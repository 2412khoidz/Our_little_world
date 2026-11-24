import { z } from 'zod';
import { getMapDefinition, TILE_SIZE } from './maps';
import type { MapId, MovementPacket, PresencePayload } from './types';

export const MOVEMENT_SEND_INTERVAL_MS = 100; // ~10 Hz when moving
export const REMOTE_STALE_TIMEOUT_MS = 5000;

export const movementPacketSchema = z.object({
  worldId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
  mapId: z.enum(['home', 'garden']),
  seq: z.number().int().nonnegative(),
  timestampMs: z.number().finite().nonnegative(),
  x: z.number().finite().min(0).max(10000),
  y: z.number().finite().min(0).max(10000),
  facing: z.enum(['down', 'up', 'left', 'right']),
  anim: z.enum(['idle', 'walk']),
});

export function isPositionWithinMapBounds(mapId: MapId, x: number, y: number): boolean {
  const mapDef = getMapDefinition(mapId);
  const maxW = mapDef.widthTiles * TILE_SIZE;
  const maxH = mapDef.heightTiles * TILE_SIZE;
  return x >= 0 && y >= 0 && x <= maxW && y <= maxH;
}

export class MovementTxThrottle {
  private lastSentAtMs = -Infinity;
  private lastSentAnim: 'idle' | 'walk' | null = null;
  private lastSentMapId: MapId | null = null;
  private seq = 0;

  constructor(private readonly intervalMs: number = MOVEMENT_SEND_INTERVAL_MS) {}

  shouldEmit(nowMs: number, anim: 'idle' | 'walk', mapId: MapId): boolean {
    if (mapId !== this.lastSentMapId) {
      this.lastSentAtMs = nowMs;
      this.lastSentAnim = anim;
      this.lastSentMapId = mapId;
      return true;
    }

    // Emit final idle frame once when stopping, then stop idle spam
    if (anim === 'idle') {
      if (this.lastSentAnim === 'walk') {
        this.lastSentAtMs = nowMs;
        this.lastSentAnim = 'idle';
        return true;
      }
      return false;
    }

    if (nowMs - this.lastSentAtMs >= this.intervalMs) {
      this.lastSentAtMs = nowMs;
      this.lastSentAnim = anim;
      return true;
    }

    return false;
  }

  nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  reset(): void {
    this.lastSentAtMs = -Infinity;
    this.lastSentAnim = null;
    this.lastSentMapId = null;
  }
}

export interface RemoteAvatarSnapshot {
  packet: MovementPacket;
  receivedAtMs: number;
}

export class RemoteAvatarFilter {
  private readonly peers = new Map<string, RemoteAvatarSnapshot>();

  constructor(private readonly staleTimeoutMs: number = REMOTE_STALE_TIMEOUT_MS) {}

  ingest(raw: unknown, localUserId: string, expectedWorldId: string, nowMs: number): MovementPacket | null {
    const parsed = movementPacketSchema.safeParse(raw);
    if (!parsed.success) return null;
    const pkt = parsed.data;

    if (pkt.worldId !== expectedWorldId) return null;
    if (pkt.userId === localUserId) return null;
    if (!isPositionWithinMapBounds(pkt.mapId, pkt.x, pkt.y)) return null;

    const previous = this.peers.get(pkt.sessionId);
    if (previous && pkt.seq <= previous.packet.seq) {
      return null; // Drop out-of-order / duplicate packets
    }

    this.peers.set(pkt.sessionId, { packet: pkt, receivedAtMs: nowMs });
    return pkt;
  }

  isStale(sessionId: string, nowMs: number): boolean {
    const entry = this.peers.get(sessionId);
    if (!entry) return true;
    return nowMs - entry.receivedAtMs > this.staleTimeoutMs;
  }

  removeSession(sessionId: string): void {
    this.peers.delete(sessionId);
  }

  clear(): void {
    this.peers.clear();
  }
}

export function stepInterpolatedPosition(
  current: { x: number; y: number },
  target: { x: number; y: number },
  deltaMs: number,
  smoothingFactor = 14,
): { x: number; y: number } {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  if (Math.hypot(dx, dy) < 0.35) {
    return { x: target.x, y: target.y };
  }
  const alpha = 1 - Math.exp(-(smoothingFactor * Math.max(0, deltaMs)) / 1000);
  return {
    x: current.x + dx * alpha,
    y: current.y + dy * alpha,
  };
}

/**
 * Deduplicates presences by userId (picking most recently updated session)
 * so one partner signed in on multiple devices never appears twice.
 */
export function selectLatestPresenceByUser(
  presences: readonly PresencePayload[],
  excludeUserId?: string,
): Map<string, PresencePayload> {
  const byUser = new Map<string, PresencePayload>();
  for (const p of presences) {
    if (excludeUserId && p.userId === excludeUserId) continue;
    const prev = byUser.get(p.userId);
    if (!prev || p.updatedAtMs >= prev.updatedAtMs) {
      byUser.set(p.userId, p);
    }
  }
  return byUser;
}
