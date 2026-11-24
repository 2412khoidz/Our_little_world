import type { CoupleAcceptPayload, CoupleEmoteId, CoupleInvitePayload } from './coupleTypes';
import { COUPLE_EMOTES } from './coupleTypes';
import type { MapId } from '../types';

export const COUPLE_INVITE_TTL_MS = 15_000;

export function getCoupleEmoteSymbol(emote: CoupleEmoteId): string {
  return COUPLE_EMOTES.find((e) => e.id === emote)?.symbol ?? '❤️';
}

export function createHugInvite(params: {
  inviteId: string;
  worldId: string;
  fromUserId: string;
  fromSessionId: string;
  toUserId: string;
  mapId: MapId;
  anchorX: number;
  anchorY: number;
  nowMs: number;
}): CoupleInvitePayload {
  return {
    type: 'COUPLE_INVITE',
    inviteId: params.inviteId,
    kind: 'hug',
    worldId: params.worldId,
    fromUserId: params.fromUserId,
    fromSessionId: params.fromSessionId,
    toUserId: params.toUserId,
    mapId: params.mapId,
    anchorX: params.anchorX,
    anchorY: params.anchorY,
    createdAtMs: params.nowMs,
    expiresAtMs: params.nowMs + COUPLE_INVITE_TTL_MS,
  };
}

export function isInviteExpired(invite: CoupleInvitePayload, nowMs: number): boolean {
  return nowMs >= invite.expiresAtMs;
}

export function validateInviteAcceptance(
  invite: CoupleInvitePayload,
  responderUserId: string,
  responderMapId: MapId,
  nowMs: number,
  alreadyConsumedInviteIds?: ReadonlySet<string>,
): { ok: true; accept: CoupleAcceptPayload } | { ok: false; reason: 'WRONG_RECIPIENT' | 'EXPIRED' | 'WRONG_MAP' | 'DUPLICATE' } {
  if (alreadyConsumedInviteIds?.has(invite.inviteId)) {
    return { ok: false, reason: 'DUPLICATE' };
  }
  if (invite.toUserId !== responderUserId) {
    return { ok: false, reason: 'WRONG_RECIPIENT' };
  }
  if (isInviteExpired(invite, nowMs)) {
    return { ok: false, reason: 'EXPIRED' };
  }
  if (invite.mapId !== responderMapId) {
    return { ok: false, reason: 'WRONG_MAP' };
  }
  return {
    ok: true,
    accept: {
      type: 'COUPLE_ACCEPT',
      inviteId: invite.inviteId,
      worldId: invite.worldId,
      fromUserId: responderUserId,
      toUserId: invite.fromUserId,
      mapId: invite.mapId,
      anchorX: invite.anchorX,
      anchorY: invite.anchorY,
      acceptedAtMs: nowMs,
    },
  };
}

/**
 * Picks an unoccupied slot (0 or 1) for shared sofa / bench / bed interactions
 * so two players sit or lie neatly side by side instead of overlapping.
 */
export function pickAvailableSharedSlot(occupiedSlots: readonly number[], preferred = 0): number {
  if (!occupiedSlots.includes(preferred)) return preferred;
  const alternate = preferred === 0 ? 1 : 0;
  if (!occupiedSlots.includes(alternate)) return alternate;
  return preferred;
}
