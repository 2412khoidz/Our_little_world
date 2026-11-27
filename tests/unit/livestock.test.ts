import { describe, expect, it } from 'vitest';
import {
  LIVESTOCK_HAPPINESS_MIN,
  LIVESTOCK_SPECIES_LIST,
  adoptLivestock,
  collectLivestockProduct,
  createLivestockState,
  effectiveLivestockHappiness,
  feedLivestockAnimal,
  petLivestockAnimal,
  projectLivestock,
} from '../../src/shared/farming/livestock';

describe('Checkpoint D — Shared cooperative livestock husbandry', () => {
  it('supports all 7 required species (chicken, duck, cow, goat, sheep, rabbit, bee)', () => {
    const ids = LIVESTOCK_SPECIES_LIST.map((s) => s.speciesId).sort();
    expect(ids).toEqual(['bee', 'chicken', 'cow', 'duck', 'goat', 'rabbit', 'sheep']);
  });

  it('supports feeding, cooperative partner petting, deluxe feed boost, and never kills animals offline', () => {
    let state = createLivestockState();

    // Adopt cow (needs feed) and bee (forages automatically without feed)
    const adoptCow = adoptLivestock(state, 'cow', 'Bò Sữa Nhỏ', 0, 'partner_a');
    expect(adoptCow.ok).toBe(true);
    if (!adoptCow.ok) throw new Error(adoptCow.messageVi);
    state = adoptCow.state;
    const cowId = adoptCow.animal.animalId;

    const adoptBee = adoptLivestock(state, 'bee', 'Tổ Ong Vườn', 0, 'partner_b');
    expect(adoptBee.ok).toBe(true);
    if (!adoptBee.ok) throw new Error(adoptBee.messageVi);
    state = adoptBee.state;
    const beeId = adoptBee.animal.animalId;

    // Bee starts producing automatically
    expect(projectLivestock(state, 0)[1]!.status).toBe('producing');
    expect(projectLivestock(state, 31 * 60_000)[1]!.status).toBe('ready');

    // Feed cow with deluxe feed
    const fed = feedLivestockAnimal(state, cowId, 'feed_deluxe', 1_000);
    expect(fed.ok).toBe(true);
    if (!fed.ok) throw new Error(fed.messageVi);
    state = fed.state;

    // Both partners care for the same cow on the same day
    const p1 = petLivestockAnimal(state, cowId, 2_000, 'partner_a', 0);
    expect(p1.ok).toBe(true);
    if (!p1.ok) throw new Error(p1.messageVi);
    expect(p1.pairCareBonus).toBe(false);
    const p2 = petLivestockAnimal(p1.state, cowId, 3_000, 'partner_b', 0);
    expect(p2.ok).toBe(true);
    if (!p2.ok) throw new Error(p2.messageVi);
    expect(p2.pairCareBonus).toBe(true);
    state = p2.state;

    // Duplicate same-partner pet on same day rejected gracefully
    const dup = petLivestockAnimal(state, cowId, 4_000, 'partner_a', 0);
    expect(dup.ok).toBe(false);

    // Offline 365 days later: animal is alive, happiness floors safely at 30, ready to collect!
    const farFuture = 365 * 86_400_000;
    const cowProj = projectLivestock(state, farFuture)[0]!;
    expect(cowProj.status).toBe('ready');
    expect(cowProj.happiness).toBe(LIVESTOCK_HAPPINESS_MIN);
    expect(effectiveLivestockHappiness(cowProj.animal, farFuture)).toBe(LIVESTOCK_HAPPINESS_MIN);

    // Collect cow & bee products
    const colCow = collectLivestockProduct(state, cowId, farFuture, () => 0.05);
    expect(colCow.ok).toBe(true);
    if (!colCow.ok) throw new Error(colCow.messageVi);
    expect(['milk', 'cream_top']).toContain(colCow.sku);
    expect(colCow.qty).toBeGreaterThanOrEqual(2);
    state = colCow.state;

    const colBee = collectLivestockProduct(state, beeId, farFuture, () => 0.1);
    expect(colBee.ok).toBe(true);
    if (colBee.ok) {
      expect(['honey', 'beeswax']).toContain(colBee.sku);
      // Bee auto-restarts production immediately
      expect(projectLivestock(colBee.state, farFuture)[1]!.status).toBe('producing');
    }
  });
});
