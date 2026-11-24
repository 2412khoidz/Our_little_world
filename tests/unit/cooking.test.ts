import { describe, expect, it } from 'vitest';
import {
  COOKING_RECIPES,
  MAX_STIR_WINDOW_BONUS_STACKS,
  RESTAURANT_ORDER_MAX_DEADLINE_MS,
  RESTAURANT_ORDER_MIN_DEADLINE_MS,
  applyCookingAction,
  createCookingSession,
  evaluateCookingQuality,
  getOrderConstraints,
  getQualityWindows,
  getRecipe,
  panTargetHeat01,
  requireRecipe,
  tick,
} from '../../src/shared/cooking';
import type {
  CookingActionResult,
  CookingErrorCode,
  CookingSession,
} from '../../src/shared/cooking';

const NOW = 1_000_000;
const PREP = 'prep-1';
const HEAT = 'heat-1';

function okSession(result: CookingActionResult): CookingSession {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`Expected success, got ${result.error.code}`);
  }
  return result.session;
}

function expectFail(result: CookingActionResult, code: CookingErrorCode): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    return;
  }
  expect(result.error.code).toBe(code);
  expect(result.error.messageVi.length).toBeGreaterThan(0);
}

function createSoup(seed: number | string = 7, nowMs: number = NOW): CookingSession {
  return createCookingSession({
    recipeSku: 'carrot_soup',
    seed,
    players: [PREP, HEAT],
    nowMs,
  });
}

function prepIngredient(
  session: CookingSession,
  ingredientSku: string,
  actorId: string = PREP,
): CookingActionResult {
  return applyCookingAction(session, { type: 'prep', actorId, ingredientSku });
}

function preppedSoup(seed: number | string = 7): CookingSession {
  let session = createSoup(seed);
  session = okSession(prepIngredient(session, 'carrot'));
  session = okSession(prepIngredient(session, 'wild_herb'));
  return session;
}

function serveAt(session: CookingSession, nowMs: number, actorId: string = HEAT): CookingActionResult {
  return applyCookingAction(session, { type: 'serve', actorId, nowMs });
}

describe('recipe definitions', () => {
  it('contains the five V0.3 dishes with the exact PRODUCTION_CHAINS ingredient lists', () => {
    expect(COOKING_RECIPES).toHaveLength(5);

    const expected: Record<
      string,
      {
        nameVi: string;
        ingredients: { sku: string; qty: number }[];
        prepStationSteps: number;
        heatProfile: string;
        minOrderStars: number;
      }
    > = {
      carrot_soup: {
        nameVi: 'Súp cà rốt ấm',
        ingredients: [
          { sku: 'carrot', qty: 2 },
          { sku: 'wild_herb', qty: 1 },
        ],
        prepStationSteps: 2,
        heatProfile: 'gentle',
        minOrderStars: 2,
      },
      herb_carp: {
        nameVi: 'Cá chép thảo mộc',
        ingredients: [
          { sku: 'carp_pond', qty: 1 },
          { sku: 'wild_herb', qty: 1 },
        ],
        prepStationSteps: 1,
        heatProfile: 'gentle',
        minOrderStars: 2,
      },
      peach_tea: {
        nameVi: 'Trà đào mật ong',
        ingredients: [
          { sku: 'peach', qty: 2 },
          { sku: 'sugar_pack', qty: 1 },
        ],
        prepStationSteps: 1,
        heatProfile: 'none',
        minOrderStars: 2,
      },
      strawberry_tart: {
        nameVi: 'Bánh tart dâu',
        ingredients: [
          { sku: 'flour', qty: 1 },
          { sku: 'strawberry', qty: 2 },
          { sku: 'spice', qty: 1 },
        ],
        prepStationSteps: 3,
        heatProfile: 'precise',
        minOrderStars: 3,
      },
      koinori_platter: {
        nameVi: 'Đĩa Koinori đặc sản',
        ingredients: [
          { sku: 'koi_pastel', qty: 1 },
          { sku: 'cabbage', qty: 1 },
          { sku: 'carrot', qty: 1 },
        ],
        prepStationSteps: 3,
        heatProfile: 'precise',
        minOrderStars: 3,
      },
    };

    for (const [sku, spec] of Object.entries(expected)) {
      const recipe = getRecipe(sku);
      expect(recipe, `missing recipe ${sku}`).toBeDefined();
      if (!recipe) {
        continue;
      }
      expect(recipe.sku).toBe(sku);
      expect(recipe.dishSku).toBe(sku);
      expect(recipe.nameVi).toBe(spec.nameVi);
      expect(recipe.ingredients).toEqual(spec.ingredients);
      expect(recipe.prepStationSteps).toBe(spec.prepStationSteps);
      expect(recipe.heatProfile).toBe(spec.heatProfile);
      expect(recipe.minOrderStars).toBe(spec.minOrderStars);
      expect(recipe.cookMs).toBeGreaterThan(0);
      expect(recipe.idealHeat01).toBeGreaterThanOrEqual(0);
      expect(recipe.idealHeat01).toBeLessThanOrEqual(1000);
      expect(recipe.heatTolerance01).toBeGreaterThan(0);
      expect(recipe.burnWindowMs).toBeGreaterThan(0);
      // Economy owns pricing: the domain must not carry a price field.
      expect('price' in recipe).toBe(false);
      expect('sellValue' in recipe).toBe(false);
    }
  });

  it('resolves unknown recipes explicitly instead of guessing', () => {
    expect(getRecipe('unknown_dish')).toBeUndefined();
    expect(() => requireRecipe('unknown_dish')).toThrowError(/Unknown cooking recipe/);
  });
});

describe('ingredient validation', () => {
  it('rejects an ingredient that is not part of the recipe', () => {
    expectFail(prepIngredient(createSoup(), 'wood_branch'), 'MISSING_INGREDIENT');
  });

  it('rejects an ingredient batch that was already prepared (nothing left)', () => {
    const session = okSession(prepIngredient(createSoup(), 'carrot'));
    expectFail(prepIngredient(session, 'carrot'), 'MISSING_INGREDIENT');
  });

  it('rejects extra ingredients once prepStationSteps is reached', () => {
    const session = preppedSoup();
    expect(session.prepDone).toBe(2);
    expectFail(prepIngredient(session, 'wild_herb'), 'WRONG_STEP');
  });

  it('correct sequence reaches prepDone === prepStationSteps', () => {
    const session = preppedSoup();
    expect(session.prepDone).toBe(requireRecipe('carrot_soup').prepStationSteps);
    expect(session.phase).toBe('cooking');
    expect(session.prepared).toEqual([
      { sku: 'carrot', qty: 2 },
      { sku: 'wild_herb', qty: 1 },
    ]);
  });

  it('every recipe can complete its declared prep steps in order', () => {
    for (const recipe of COOKING_RECIPES) {
      let session = createCookingSession({
        recipeSku: recipe.sku,
        seed: 11,
        players: [PREP, HEAT],
        nowMs: NOW,
      });
      const preppable = recipe.ingredients.slice(0, recipe.prepStationSteps);
      for (const ingredient of preppable) {
        session = okSession(prepIngredient(session, ingredient.sku));
      }
      expect(session.prepDone, recipe.sku).toBe(recipe.prepStationSteps);
      expect(session.phase, recipe.sku).toBe('cooking');
    }
  });

  it('every recipe can be served for three stars at its ideal cook time', () => {
    for (const recipe of COOKING_RECIPES) {
      let session = createCookingSession({
        recipeSku: recipe.sku,
        seed: 12,
        players: [PREP, HEAT],
        nowMs: NOW,
      });
      const preppable = recipe.ingredients.slice(0, recipe.prepStationSteps);
      for (const ingredient of preppable) {
        session = okSession(prepIngredient(session, ingredient.sku));
      }
      const served = okSession(serveAt(session, NOW + recipe.cookMs));
      expect(served.phase, recipe.sku).toBe('done');
      expect(served.quality, recipe.sku).toBe(3);
      expect(served.outcome?.dishSku, recipe.sku).toBe(recipe.dishSku);
    }
  });
});

describe('role ownership and co-op contract', () => {
  it('rejects a prep action from the heat role', () => {
    expectFail(prepIngredient(createSoup(), 'carrot', HEAT), 'NOT_YOUR_ROLE');
  });

  it('rejects a stir action from the prep role', () => {
    expectFail(
      applyCookingAction(preppedSoup(), { type: 'stir', actorId: PREP }),
      'NOT_YOUR_ROLE',
    );
  });

  it('rejects an unknown player with UNKNOWN_PLAYER', () => {
    expectFail(
      applyCookingAction(preppedSoup(), { type: 'stir', actorId: 'stranger' }),
      'UNKNOWN_PLAYER',
    );
  });

  it('rejects serving from the prep role', () => {
    expectFail(serveAt(preppedSoup(), NOW + 12_000, PREP), 'NOT_YOUR_ROLE');
  });

  it('keeps the two-role contract unless soloMode is explicit', () => {
    expect(() =>
      createCookingSession({
        recipeSku: 'carrot_soup',
        seed: 1,
        players: ['solo-only'],
        nowMs: NOW,
      }),
    ).toThrowError(/soloMode/);
    expect(() =>
      createCookingSession({
        recipeSku: 'carrot_soup',
        seed: 1,
        players: ['same-player', 'same-player'],
        nowMs: NOW,
      }),
    ).toThrowError(/soloMode/);
  });

  it('allows one player to run both stations only when soloMode is enabled', () => {
    let session = createCookingSession({
      recipeSku: 'peach_tea',
      seed: 3,
      players: ['solo-1'],
      nowMs: NOW,
      soloMode: true,
    });
    session = okSession(prepIngredient(session, 'peach', 'solo-1'));
    session = okSession(applyCookingAction(session, { type: 'adjustHeat', actorId: 'solo-1', delta: 1 }));
    const served = serveAt(session, NOW + requireRecipe('peach_tea').cookMs, 'solo-1');
    expect(okSession(served).quality).toBe(3);
  });
});

describe('timing and quality windows', () => {
  it('rejects serving before prep is complete', () => {
    expectFail(serveAt(createSoup(), NOW + 12_500), 'WRONG_STEP');
  });

  it('rejects serving before cookMs', () => {
    expectFail(serveAt(preppedSoup(), NOW + 11_999), 'WRONG_STEP');
  });

  it('gives three stars when served at cookMs with heat near ideal', () => {
    const served = okSession(serveAt(preppedSoup(), NOW + 12_000));
    expect(served.phase).toBe('done');
    expect(served.quality).toBe(3);
    expect(served.outcome?.kind).toBe('served');
    expect(served.outcome?.dishSku).toBe('carrot_soup');
    expect(served.outcome?.elapsedMs).toBe(12_000);
  });

  it('lowers to two stars in the wider window and one star after it', () => {
    const twoStars = okSession(serveAt(preppedSoup(), NOW + 14_000));
    expect(twoStars.quality).toBe(2);

    const oneStar = okSession(serveAt(preppedSoup(), NOW + 17_000));
    expect(oneStar.quality).toBe(1);
    expect(oneStar.outcome?.kind).toBe('served');
  });

  it('uses exact inclusive star boundaries', () => {
    const cases: { lateMs: number; expected: 1 | 2 | 3 }[] = [
      { lateMs: 1_500, expected: 3 },
      { lateMs: 1_501, expected: 2 },
      { lateMs: 3_000, expected: 2 },
      { lateMs: 3_001, expected: 1 },
      { lateMs: 6_000, expected: 1 }, // exactly at cookMs + burnWindowMs
    ];
    for (const testCase of cases) {
      const served = okSession(serveAt(preppedSoup(), NOW + 12_000 + testCase.lateMs));
      expect(served.quality, `late ${testCase.lateMs}ms`).toBe(testCase.expected);
    }
  });

  it('burns when served after cookMs + burnWindowMs, losing the dish', () => {
    const result = serveAt(preppedSoup(), NOW + 12_000 + 6_000 + 1);
    expectFail(result, 'BURNED');
    expect(result.session.phase).toBe('burned');
    expect(result.session.quality).toBeNull();
    expect(result.session.outcome?.kind).toBe('burned');
    expect(result.session.outcome?.dishSku).toBeNull();
    expect(result.session.outcome?.quality).toBeNull();
  });

  it('rejects further actions after done or burned', () => {
    const done = okSession(serveAt(preppedSoup(), NOW + 12_000));
    expectFail(
      applyCookingAction(done, { type: 'stir', actorId: HEAT }),
      'ALREADY_FINISHED',
    );
    expectFail(
      applyCookingAction(done, { type: 'prep', actorId: PREP, ingredientSku: 'carrot' }),
      'ALREADY_FINISHED',
    );

    const burned = tick(preppedSoup(), NOW + 12_000 + 6_001);
    expectFail(
      applyCookingAction(burned, { type: 'stir', actorId: HEAT }),
      'BURNED',
    );
  });

  it('exposes the exact quality window math', () => {
    const soup = requireRecipe('carrot_soup');
    expect(getQualityWindows(soup, 0)).toEqual({
      threeStarWindowMs: 1_500,
      twoStarWindowMs: 3_000,
    });
    expect(getQualityWindows(soup, 2)).toEqual({
      threeStarWindowMs: 2_100,
      twoStarWindowMs: 3_000,
    });
    expect(MAX_STIR_WINDOW_BONUS_STACKS).toBe(3);
    expect(evaluateCookingQuality(preppedSoup())).toBe(1);
  });
});

describe('heat management', () => {
  it('clamps adjustHeat to 0..1000', () => {
    let session = preppedSoup();
    for (let index = 0; index < 4; index += 1) {
      session = okSession(
        applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: 2 }),
      );
    }
    expect(session.heat01).toBe(1000);
    for (let index = 0; index < 8; index += 1) {
      session = okSession(
        applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: -2 }),
      );
    }
    expect(session.heat01).toBe(0);
  });

  it('rejects deltas outside -2..+2 steps', () => {
    const session = preppedSoup();
    expectFail(
      applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: 3 }),
      'INVALID_ACTION',
    );
    expectFail(
      applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: 0 }),
      'INVALID_ACTION',
    );
  });

  it('burns the dish after staying out of tolerance longer than burnWindowMs', () => {
    let session = preppedSoup();
    session = okSession(
      applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: 2 }),
    );
    expect(session.heat01).toBeGreaterThan(requireRecipe('carrot_soup').idealHeat01 + 110);

    const ticked = tick(session, NOW + 6_001);
    expect(ticked.phase).toBe('burned');
    expect(ticked.outcome?.reason).toBe('HEAT');
    expect(ticked.outcome?.dishSku).toBeNull();

    expectFail(serveAt(ticked, NOW + 6_100), 'BURNED');
  });

  it('does not reset the out-of-band timer while heat stays wrong across ticks', () => {
    let session = preppedSoup();
    session = okSession(
      applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: 2 }),
    );
    for (let elapsed = 1_000; elapsed <= 6_000; elapsed += 1_000) {
      session = tick(session, NOW + elapsed);
      expect(session.phase).toBe('cooking');
    }
    expect(session.outOfToleranceMs).toBe(6_000);
    session = tick(session, NOW + 6_001);
    expect(session.phase).toBe('burned');
    expect(session.outcome?.reason).toBe('HEAT');
  });

  it('stirs toward ideal heat with a cooldown', () => {
    let session = preppedSoup();
    session = okSession(
      applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: 2 }),
    );
    const hotHeat = session.heat01;
    session = okSession(applyCookingAction(session, { type: 'stir', actorId: HEAT }));
    expect(session.heat01).toBe(hotHeat - 80);
    expect(session.stirCount).toBe(1);

    expectFail(
      applyCookingAction(session, { type: 'stir', actorId: HEAT }),
      'COOLDOWN',
    );
    session = tick(session, NOW + 1_200);
    expect(okSession(applyCookingAction(session, { type: 'stir', actorId: HEAT })).stirCount).toBe(2);
  });

  it('uses stirs as a small quality bonus that widens the three-star window', () => {
    const withoutStir = okSession(serveAt(preppedSoup(), NOW + 12_000 + 1_600));
    expect(withoutStir.quality).toBe(2);

    let withStir = preppedSoup();
    withStir = okSession(applyCookingAction(withStir, { type: 'stir', actorId: HEAT }));
    const served = okSession(serveAt(withStir, NOW + 12_000 + 1_600));
    expect(served.quality).toBe(3);
  });
});

describe('determinism', () => {
  it('same seed and same action/time sequence produce identical state', () => {
    const run = (seed: number): CookingSession => {
      let session = preppedSoup(seed);
      session = okSession(
        applyCookingAction(session, { type: 'adjustHeat', actorId: HEAT, delta: 1 }),
      );
      return okSession(serveAt(session, NOW + 13_600));
    };

    const first = run(42);
    const second = run(42);
    expect(second).toEqual(first);
    expect(second.outcome).toEqual(first.outcome);
    expect(second.quality).toBe(first.quality);

    const other = run(43);
    expect(other.rngSeed).not.toBe(first.rngSeed);
  });

  it('same seed produces the same pan curve; a different seed differs', () => {
    const soup = requireRecipe('carrot_soup');
    const samples = (seed: number): number[] =>
      Array.from({ length: 40 }, (_, index) => panTargetHeat01(soup, seed, index * 750));

    const base = samples(1);
    expect(samples(1)).toEqual(base);
    expect(base.every((value) => value >= 0 && value <= 1000)).toBe(true);
    expect(samples(2)).not.toEqual(base);
  });

  it('tick is stable when called with the same timestamp twice', () => {
    const session = preppedSoup();
    const once = tick(session, NOW + 4_000);
    const twice = tick(once, NOW + 4_000);
    expect(twice).toEqual(once);
  });
});

describe('serialization and economy boundary', () => {
  it('JSON round-trips the session and outcome', () => {
    const served = okSession(serveAt(preppedSoup(), NOW + 13_500));
    const clone = JSON.parse(JSON.stringify(served)) as CookingSession;
    expect(clone).toEqual(served);
    expect(clone.outcome).toEqual(served.outcome);
    expect(clone.phase).toBe('done');
  });

  it('produces no coin/price/reward fields — economy decides value', () => {
    const served = okSession(serveAt(preppedSoup(), NOW + 13_500));
    const outcome = served.outcome;
    expect(outcome).not.toBeNull();
    if (!outcome) {
      return;
    }
    for (const key of ['coins', 'price', 'reward', 'sellValue', 'rewardCoins']) {
      expect(Object.prototype.hasOwnProperty.call(outcome, key), key).toBe(false);
    }
    for (const key of ['coins', 'price', 'reward']) {
      expect(Object.prototype.hasOwnProperty.call(served, key), key).toBe(false);
    }
  });
});

describe('restaurant orders', () => {
  const servedThreeStars = (): CookingSession =>
    okSession(serveAt(preppedSoup(), NOW + 13_500));
  const servedTwoStars = (): CookingSession =>
    okSession(serveAt(preppedSoup(), NOW + 14_000));

  it('accepts a valid order within the canonical timer range', () => {
    const result = getOrderConstraints(servedThreeStars(), {
      orderId: 'order-1',
      dishSku: 'carrot_soup',
      minStars: 2,
      deadlineMs: RESTAURANT_ORDER_MIN_DEADLINE_MS,
      rewardMultiplierBp: 170,
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects the wrong dish', () => {
    const result = getOrderConstraints(servedThreeStars(), {
      dishSku: 'strawberry_tart',
      minStars: 2,
      deadlineMs: 120_000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('WRONG_DISH');
    }
  });

  it('rejects a late order (order fails, the cooked dish survives)', () => {
    const session = servedThreeStars();
    const shortDeadline = getOrderConstraints(session, {
      dishSku: 'carrot_soup',
      minStars: 2,
      deadlineMs: 5_000,
    });
    expect(shortDeadline.ok).toBe(false);
    if (!shortDeadline.ok) {
      expect(shortDeadline.reason).toBe('TOO_SLOW');
    }

    const canonicalDeadline = getOrderConstraints(session, {
      dishSku: 'carrot_soup',
      minStars: 2,
      deadlineMs: RESTAURANT_ORDER_MIN_DEADLINE_MS,
      createdAtMs: NOW - 100_000,
    });
    expect(canonicalDeadline.ok).toBe(false);
    if (!canonicalDeadline.ok) {
      expect(canonicalDeadline.reason).toBe('TOO_SLOW');
    }

    expect(session.phase).toBe('done');
    expect(session.quality).toBe(3);
  });

  it('rejects a dish below the requested stars', () => {
    const result = getOrderConstraints(servedTwoStars(), {
      dishSku: 'carrot_soup',
      minStars: 3,
      deadlineMs: RESTAURANT_ORDER_MAX_DEADLINE_MS,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('STARS_TOO_LOW');
    }
  });

  it('rejects burned dishes and invalid order parameters', () => {
    const burned = tick(preppedSoup(), NOW + 12_000 + 6_001);
    const burnedResult = getOrderConstraints(burned, {
      dishSku: 'carrot_soup',
      minStars: 2,
      deadlineMs: 120_000,
    });
    expect(burnedResult.ok).toBe(false);
    if (!burnedResult.ok) {
      expect(burnedResult.reason).toBe('BURNED');
    }

    const invalidStars = getOrderConstraints(servedThreeStars(), {
      dishSku: 'carrot_soup',
      minStars: 1,
      deadlineMs: 120_000,
    });
    expect(invalidStars.ok).toBe(false);
    if (!invalidStars.ok) {
      expect(invalidStars.reason).toBe('STARS_TOO_LOW');
    }

    const invalidMultiplier = getOrderConstraints(servedThreeStars(), {
      dishSku: 'carrot_soup',
      minStars: 2,
      deadlineMs: 120_000,
      rewardMultiplierBp: 150,
    });
    expect(invalidMultiplier.ok).toBe(false);
    if (!invalidMultiplier.ok) {
      expect(invalidMultiplier.reason).toBe('INVALID_ACTION');
    }
  });
});
