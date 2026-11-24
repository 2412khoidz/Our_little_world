import { describe, expect, it } from 'vitest';
import {
  COUPLE_INVITE_TTL_MS,
  createHugInvite,
  isInviteExpired,
  pickAvailableSharedSlot,
  validateInviteAcceptance,
} from '../../src/shared/couple/coupleProtocol';

describe('V0.1.5 Couple Interactions Protocol (OLW-015-07)', () => {
  it('enforces 15s invite TTL, recipient verification, map check, and anti-duplicate consumption', () => {
    const t0 = 1_700_000_000_000;
    const inv = createHugInvite({
      inviteId: 'hug-1',
      worldId: 'w1',
      fromUserId: 'may',
      fromSessionId: 's1',
      toUserId: 'nang',
      mapId: 'home',
      anchorX: 120,
      anchorY: 140,
      nowMs: t0,
    });

    expect(isInviteExpired(inv, t0 + COUPLE_INVITE_TTL_MS - 1)).toBe(false);
    expect(isInviteExpired(inv, t0 + COUPLE_INVITE_TTL_MS)).toBe(true);

    const wrongActor = validateInviteAcceptance(inv, 'outsider', 'home', t0 + 1000);
    expect(wrongActor).toEqual({ ok: false, reason: 'WRONG_RECIPIENT' });

    const wrongMap = validateInviteAcceptance(inv, 'nang', 'garden', t0 + 1000);
    expect(wrongMap).toEqual({ ok: false, reason: 'WRONG_MAP' });

    const late = validateInviteAcceptance(inv, 'nang', 'home', t0 + 16_000);
    expect(late).toEqual({ ok: false, reason: 'EXPIRED' });

    const consumed = new Set<string>();
    const accepted = validateInviteAcceptance(inv, 'nang', 'home', t0 + 2000, consumed);
    expect(accepted.ok).toBe(true);
    consumed.add(inv.inviteId);

    const duplicate = validateInviteAcceptance(inv, 'nang', 'home', t0 + 2500, consumed);
    expect(duplicate).toEqual({ ok: false, reason: 'DUPLICATE' });
  });

  it('assigns non-overlapping shared slots for sofa, bench, and double bed', () => {
    expect(pickAvailableSharedSlot([])).toBe(0);
    expect(pickAvailableSharedSlot([0])).toBe(1);
    expect(pickAvailableSharedSlot([1])).toBe(0);
    expect(pickAvailableSharedSlot([0, 1], 1)).toBe(1);
  });
});
