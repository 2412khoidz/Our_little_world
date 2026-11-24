import { describe, expect, it } from 'vitest';
import { isSafeCatFoodSku } from '../../src/shared/petLiving/petFoodCatalog';
import {
  catDrinkFromBowl,
  createAdoptionState,
  createInitialPhysicalCareState,
  fillFoodBowlFromHeld,
  fillWaterPitcherFree,
  interactPetGently,
  pourWaterIntoBowl,
  progressAdoptionStory,
  resolvePetEat,
} from '../../src/shared/petLiving/petPhysicalCare';

describe('Physical Pet Care, Bowls, Preferences & Adoption FSM (M3)', () => {
  it('blocks toxic ingredients and refuses overfeeding without consuming food', () => {
    expect(isSafeCatFoodSku('chocolate_cake')).toBe(false);
    expect(isSafeCatFoodSku('onion_soup')).toBe(false);
    expect(isSafeCatFoodSku('fish_salmon_bite')).toBe(true);

    const state = { ...createInitialPhysicalCareState(), hunger: 96 };
    const fullAttempt = resolvePetEat(state, { sku: 'fish_salmon_bite', quality: 'gold' }, 10_000);
    expect(fullAttempt.ate).toBe(false);
    expect(fullAttempt.reaction).toBe('full_refuse');
    expect(fullAttempt.consumeHeldQty).toBe(0);
  });

  it('keeps Inventory -> Bowl -> Consumed transfer strictly one-to-one without double deduction', () => {
    const start = createInitialPhysicalCareState();
    const poured = fillFoodBowlFromHeld(start, 'fish_carp_grilled', 'normal');
    expect(poured.ok).toBe(true);
    if (!poured.ok) return;
    expect(poured.deductInventoryQty).toBe(1);
    expect(poured.next.foodBowl.portions).toBe(1);

    const eaten = resolvePetEat(poured.next, 'bowl', 50_000);
    expect(eaten.ate).toBe(true);
    expect(eaten.consumeHeldQty).toBe(0); // Never deduct inventory a second time!
    expect(eaten.next.foodBowl.portions).toBe(0);
    expect(eaten.next.hunger).toBeGreaterThan(start.hunger);
  });

  it('bounds water refills at capacity=100 and respects sleeping cats during petting', () => {
    let state = { ...createInitialPhysicalCareState(), waterBowl: { volume: 90, capacity: 100 as const }, pitcherWater: 0 };
    state = fillWaterPitcherFree(state);
    const poured = pourWaterIntoBowl(state);
    expect(poured.ok).toBe(true);
    if (!poured.ok) return;
    expect(poured.added).toBe(10);
    expect(poured.next.waterBowl.volume).toBe(100);

    const drink = catDrinkFromBowl({ ...poured.next, thirst: 40 });
    expect(drink.drank).toBe(true);
    expect(drink.next.waterBowl.volume).toBe(75);

    const sleepingPet = interactPetGently({ ...drink.next, isSleeping: true }, 60_000);
    expect(sleepingPet.accepted).toBe(false);
    expect(sleepingPet.reaction).toBe('sleepy_glance');
  });

  it('progresses warm stray adoption idempotently and preserves already-adopted worlds', () => {
    const existing = createAdoptionState({ id: 'pet-old', name: 'Mướp' });
    expect(existing.stage).toBe('adopted');
    const unchanged = progressAdoptionStory(existing, { type: 'confirm_adopt', petId: 'dup', name: 'Khác' });
    expect(unchanged.adoptedPetId).toBe('pet-old');
    expect(unchanged.adoptedName).toBe('Mướp');

    let stray = createAdoptionState(null);
    stray = progressAdoptionStory(stray, { type: 'offer_starter_food' });
    expect(stray.stage).toBe('warming_up');
    stray = progressAdoptionStory(stray, { type: 'gentle_pet' });
    expect(stray.stage).toBe('ready_to_adopt');
    stray = progressAdoptionStory(stray, { type: 'confirm_adopt', petId: 'pet-new', name: 'Quýt' });
    expect(stray.stage).toBe('adopted');
    expect(stray.adoptedName).toBe('Quýt');
  });
});
