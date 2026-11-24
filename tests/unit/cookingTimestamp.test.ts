/**
 * P4 — cooking timestamp safety regressions.
 *
 * Covers the GPT findings: backwards clocks, serving before the order exists,
 * ownership of the cooking session, and long-tick vs many-short-tick integration.
 */

import { describe, expect, it } from 'vitest';
import {
  applyCookingAction,
  createCookingSession,
  getOrderConstraints,
  PAN_BUCKET_MS,
  tick,
} from '../../src/shared/cooking/cookingMachine';
import { requireRecipe } from '../../src/shared/cooking/recipes';
import type {
  CookingActionResult,
  CookingSession,
  RestaurantOrder,
} from '../../src/shared/cooking/types';

const PREP = 'prep-player';
const HEAT = 'heat-player';
const NOW = 1_000_000;

function ok(result: CookingActionResult): CookingSession {
  if (!result.ok) {
    throw new Error(result.error.messageVi);
  }
  return result.session;
}

function createSoup(seed = 7): CookingSession {
  return createCookingSession({
    recipeSku: 'carrot_soup',
    seed,
    players: [PREP, HEAT],
    nowMs: NOW,
  });
}

function preppedSoup(): CookingSession {
  let session = createSoup();
  session = ok(applyCookingAction(session, { type: 'prep', actorId: PREP, ingredientSku: 'carrot' }));
  session = ok(applyCookingAction(session, { type: 'prep', actorId: PREP, ingredientSku: 'wild_herb' }));
  return session;
}

function servedSession(): CookingSession {
  let session = preppedSoup();
  const recipe = requireRecipe('carrot_soup');
  session = tick(session, NOW + recipe.cookMs + 1);
  session = ok(applyCookingAction(session, { type: 'serve', actorId: HEAT, nowMs: NOW + recipe.cookMs + 1 }));
  return session;
}

describe('P4 — monotonic server clock', () => {
  it('never rewinds elapsed time when a stale tick arrives', () => {
    const session = preppedSoup();
    const advanced = tick(session, NOW + 3_000);
    expect(advanced.elapsedMs).toBeGreaterThan(0);
    const stale = tick(advanced, NOW + 1_000);
    expect(stale.elapsedMs).toBe(advanced.elapsedMs);
    expect(stale.heat01).toBe(advanced.heat01);
  });

  it('rejects serving with a timestamp older than the last action', () => {
    const session = tick(preppedSoup(), NOW + 3_000);
    const result = applyCookingAction(session, {
      type: 'serve',
      actorId: HEAT,
      nowMs: NOW + 100,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_ACTION');
  });

  it('records the server tick time, not the client-supplied time', () => {
    const served = servedSession();
    expect(served.outcome?.kind).toBe('served');
    const recipe = requireRecipe('carrot_soup');
    // Elapsed is driven by the server clock; the served outcome must agree with
    // the session's integrated clock.
    expect(served.outcome?.completedAtMs).toBeGreaterThanOrEqual(NOW + recipe.cookMs);
    expect(served.outcome?.elapsedMs).toBe(served.elapsedMs);
  });
});

describe('P4 — step-independent integration', () => {
  it('one long tick equals several bucket-aligned short ticks', () => {
    const recipe = requireRecipe('carrot_soup');
    const total = Math.floor((recipe.cookMs * 0.8) / PAN_BUCKET_MS) * PAN_BUCKET_MS;

    const oneShot = tick(preppedSoup(), NOW + total);

    let stepped = preppedSoup();
    for (let elapsed = PAN_BUCKET_MS; elapsed <= total; elapsed += PAN_BUCKET_MS) {
      stepped = tick(stepped, NOW + elapsed);
    }

    expect(stepped.elapsedMs).toBe(oneShot.elapsedMs);
    expect(stepped.heat01).toBeCloseTo(oneShot.heat01, 6);
    expect(stepped.outOfToleranceMs).toBe(oneShot.outOfToleranceMs);
    expect(stepped.phase).toBe(oneShot.phase);
  });
});

describe('P4 — order window and ownership', () => {
  const order: RestaurantOrder = {
    orderId: 'resto-1',
    dishSku: 'carrot_soup',
    minStars: 2,
    rewardMultiplierBp: 180,
    createdAtMs: NOW + 1,
    deadlineMs: 120_000,
  };

  it('accepts a dish served inside the order window', () => {
    const served = servedSession();
    expect(getOrderConstraints(served, order, HEAT)).toEqual({ ok: true });
  });

  it('rejects a dish completed before the order was created', () => {
    const served = servedSession();
    const completedAtMs = served.outcome?.completedAtMs ?? 0;
    const result = getOrderConstraints(served, {
      ...order,
      createdAtMs: completedAtMs + 1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('TOO_EARLY');
  });

  it('rejects a player who is not part of the cooking session', () => {
    const served = servedSession();
    const result = getOrderConstraints(served, order, 'stranger');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('UNKNOWN_PLAYER');
  });

  it('rejects a dish served after the order deadline', () => {
    const served = servedSession();
    const expired: RestaurantOrder = {
      ...order,
      createdAtMs: NOW,
      deadlineMs: 1,
    };
    const result = getOrderConstraints(served, expired, HEAT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('TOO_SLOW');
  });
});
