import {
  COUPLE_EMOTES,
  COUPLE_INTERACTION_OPTIONS,
  type CoupleAcceptPayload,
  type CoupleEmoteId,
  type CoupleInteractionKind,
  type CoupleInteractionOption,
  type CoupleInvitePayload,
} from './coupleTypes';
import type { Direction, MapId } from '../types';

export const COUPLE_INVITE_TTL_MS = 15_000;

export function getCoupleInteractionMeta(kind: CoupleInteractionKind): CoupleInteractionOption {
  return COUPLE_INTERACTION_OPTIONS.find((item) => item.id === kind) ?? COUPLE_INTERACTION_OPTIONS[1]!;
}

export function resolveCoupleAcceptPose(
  kind: CoupleInteractionKind,
  anchorX: number,
  anchorY: number,
  isInviter: boolean,
): { x: number; y: number; facing: Direction } {
  const meta = getCoupleInteractionMeta(kind);
  const halfSpacing =
    kind === 'hug'
      ? 5
      : kind === 'hold_hands'
        ? 6
        : Math.max(4, Math.round(meta.spacingPx / 2));
  return {
    x: anchorX + (isInviter ? -halfSpacing : halfSpacing),
    y: anchorY,
    facing: meta.facePartner ? (isInviter ? 'right' : 'left') : 'down',
  };
}

export function getCoupleEmoteSymbol(emote: CoupleEmoteId): string {
  return COUPLE_EMOTES.find((e) => e.id === emote)?.symbol ?? '❤️';
}

export function createCoupleInvite(params: {
  inviteId: string;
  kind: CoupleInteractionKind;
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
    kind: params.kind,
    worldId: params.worldId,
    fromUserId: params.fromUserId,
    fromSessionId: params.fromSessionId,
    toUserId: params.toUserId,
    mapId: params.mapId,
    anchorX: params.anchorX,
    anchorY: params.anchorY,
    createdAtMs: params.nowMs,
    expiresAtMs: params.nowMs + COUPLE_INVITE_TTL_MS,
    ttlMs: COUPLE_INVITE_TTL_MS,
  };
}

export function resolveInviteLocalExpiryMs(ttlMs: number | undefined, nowLocalMs: number): number {
  const safeTtl =
    typeof ttlMs === 'number' && Number.isFinite(ttlMs)
      ? Math.max(1_000, Math.min(30_000, ttlMs))
      : COUPLE_INVITE_TTL_MS;
  return nowLocalMs + safeTtl;
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
  return createCoupleInvite({ ...params, kind: 'hug' });
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
      kind: invite.kind,
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
