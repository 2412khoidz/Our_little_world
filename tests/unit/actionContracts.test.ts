/**
 * P3 — server-authoritative gameplay action contracts.
 */

import { describe, expect, it } from 'vitest';
import {
  assertNoClientAuthority,
  businessKey,
  createActionContext,
  isActionKey,
  validateActionContext,
  validateRewardIntent,
  type ActionContext,
} from '../../src/shared/gameplay/actionContracts';

function context(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    actionKey: businessKey('crop_cycle', 'world-1', 'plot-3', 2),
    kind: 'crop_cycle',
    actorId: 'actor-1',
    expectedStateVersion: 5,
    serverNowMs: 1_000,
    serverSeed: 42,
    ...overrides,
  };
}

describe('P3 — business keys', () => {
  it('namespaces by action kind and normalises separators', () => {
    expect(businessKey('fishing_cast', 'w1', 'lake', 3)).toBe('fishing_cast:w1:lake:3');
    expect(businessKey('crop_cycle', 'w1', 'a:b')).toBe('crop_cycle:w1:a_b');
    expect(isActionKey(businessKey('order_completion', 'w1', 'ord-1'))).toBe(true);
    expect(() => businessKey('crop_cycle')).toThrow();
  });

  it('is stable and unique per entity instance', () => {
    expect(businessKey('breeding_attempt', 'w', 10)).toBe(businessKey('breeding_attempt', 'w', 10));
    expect(businessKey('breeding_attempt', 'w', 10)).not.toBe(
      businessKey('breeding_attempt', 'w', 11),
    );
  });
});

describe('P3 — action context validation', () => {
  it('accepts a fresh action with a matching version', () => {
    const result = validateActionContext(context(), { stateVersion: 5, lastActionAtMs: 900 });
    expect(result).toEqual({ ok: true, nextVersion: 6 });
  });

  it('rejects a stale or mismatched version', () => {
    const result = validateActionContext(context({ expectedStateVersion: 4 }), {
      stateVersion: 5,
      lastActionAtMs: 900,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('VERSION_MISMATCH');
  });

  it('rejects a replayed business key', () => {
    const ctx = context();
    const result = validateActionContext(ctx, { stateVersion: 5, lastActionAtMs: 0 }, [
      ctx.actionKey,
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('DUPLICATE_ACTION');
  });

  it('rejects a backwards server clock', () => {
    const result = validateActionContext(context({ serverNowMs: 500 }), {
      stateVersion: 5,
      lastActionAtMs: 900,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NON_MONOTONIC_TIME');
  });

  it('rejects a missing actor or a client-chosen seed', () => {
    const missingActor = validateActionContext(context({ actorId: '' }), null);
    expect(missingActor.ok === false && missingActor.code).toBe('MISSING_ACTOR');

    expect(() => createActionContext({
      kind: 'fishing_cast',
      parts: ['w1', 1],
      actorId: 'a',
      expectedStateVersion: 1,
      serverNowMs: 1,
      serverSeed: 1.5,
    })).toThrow();
  });
});

describe('P3 — client authority', () => {
  it('rejects payloads that author server-owned fields', () => {
    for (const field of ['seed', 'nowMs', 'reward', 'coins', 'items', 'quality'] as const) {
      const result = assertNoClientAuthority({ action: 'harvest', [field]: 1 });
      expect(result.ok, field).toBe(false);
      if (result.ok) continue;
      expect(result.code).toBe('CLIENT_AUTHORITY');
    }
  });

  it('accepts a normal request payload', () => {
    expect(assertNoClientAuthority({ plotIndex: 3, cropSku: 'wheat' })).toEqual({
      ok: true,
      nextVersion: 0,
    });
  });

  it('requires rewards to be tied to a business action and a positive quantity', () => {
    expect(
      validateRewardIntent({
        actionKey: businessKey('crop_cycle', 'w', 1),
        sku: 'wheat',
        qty: 2,
        reason: 'harvest',
      }),
    ).toEqual({ ok: true, nextVersion: 0 });

    expect(
      validateRewardIntent({ actionKey: 'not-a-key', sku: 'wheat', qty: 2, reason: 'harvest' }).ok,
    ).toBe(false);
    expect(
      validateRewardIntent({
        actionKey: businessKey('crop_cycle', 'w', 1),
        sku: 'wheat',
        qty: 0,
        reason: 'harvest',
      }).ok,
    ).toBe(false);
  });
});
