import { z } from 'zod';
import { getMapDefinition, MAP_IDS, TILE_SIZE } from './maps';
import type { MapId, MovementPacket, PresencePayload } from './types';

export const MOVEMENT_SEND_INTERVAL_MS = 125;
export const MOVEMENT_POSITION_DELTA_PX = 2;
export const REMOTE_STALE_TIMEOUT_MS = 5000;

export const movementPacketSchema = z.object({
  worldId: z.string().min(1).max(128),
  userId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(128),
  mapId: z.enum(MAP_IDS),
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

type MovementPosition = Pick<MovementPacket, 'x' | 'y' | 'facing'>;

export class MovementTxThrottle {
  private lastSentAtMs = -Infinity;
  private lastSentMapId: MapId | null = null;
  private lastSentPosition: MovementPosition | undefined;
  private wasWalking = false;
  private seq = 0;

  constructor(private readonly intervalMs: number = MOVEMENT_SEND_INTERVAL_MS) {}

  shouldEmit(
    nowMs: number,
    anim: MovementPacket['anim'],
    mapId: MapId,
    position: MovementPosition,
    forceIdle = false,
  ): boolean {
    const stopped = anim === 'idle' && this.wasWalking;
    this.wasWalking = anim === 'walk';
    const urgent = mapId !== this.lastSentMapId || stopped || (anim === 'idle' && forceIdle);
    if (!urgent) {
      if (anim === 'idle' || nowMs - this.lastSentAtMs < this.intervalMs) return false;

      const last = this.lastSentPosition;
      if (
        last && position.facing === last.facing &&
        Math.hypot(position.x - last.x, position.y - last.y) < MOVEMENT_POSITION_DELTA_PX
      ) {
        return false;
      }
    }

    this.lastSentAtMs = nowMs;
    this.lastSentMapId = mapId;
    this.lastSentPosition = position;
    return true;
  }

  nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  reset(): void {
    this.lastSentAtMs = -Infinity;
    this.lastSentMapId = null;
    this.lastSentPosition = undefined;
    this.wasWalking = false;
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

  getLatestPacket(sessionId: string): MovementPacket | undefined {
    return this.peers.get(sessionId)?.packet;
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
