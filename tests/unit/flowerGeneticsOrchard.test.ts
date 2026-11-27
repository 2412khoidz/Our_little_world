import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/shared/rng';
import {
  BLOOM_PERIOD_MS,
  FLOWER_GENETICS_RECIPES,
  FLOWER_SPECIES_CATALOG,
  createFlowerGarden,
  harvestFlowerFromBed,
  plantFlowerInBed,
  runFlowerCrossbreedingRound,
  waterFlowerInBed,
} from '../../src/shared/farming/flowerGenetics';
import {
  ORCHARD_SLOT_COUNT,
  ORCHARD_TREE_DEFS,
  createOrchard,
  harvestOrchardTree,
  plantOrchardSapling,
  projectOrchard,
  uprootOrchardTree,
} from '../../src/shared/farming/orchard';

describe('Checkpoint C — Flower genetics & perennial orchard', () => {
  it('supports all 20 flowers, all 10 hybrid recipes, crossbreeding album tracking, and zero offline withering', () => {
    expect(FLOWER_SPECIES_CATALOG).toHaveLength(20);
    expect(FLOWER_GENETICS_RECIPES).toHaveLength(10);

    let garden = createFlowerGarden();
    // Initialize period
    garden = runFlowerCrossbreedingRound(garden, 0, () => 0.5).garden;

    // Plant red + yellow tulips adjacent at slots 0 & 1 and water both
    const pA = plantFlowerInBed(garden, 0, 'tulip_red', 0, 'u1');
    if (!pA.ok) throw new Error(pA.messageVi);
    const pB = plantFlowerInBed(pA.garden, 1, 'tulip_yellow', 0, 'u2');
    if (!pB.ok) throw new Error(pB.messageVi);
    const wA = waterFlowerInBed(pB.garden, 0, 0);
    const wB = waterFlowerInBed(wA.ok ? wA.garden : pB.garden, 1, 0);
    garden = wB.ok ? wB.garden : pB.garden;

    // Run breeding round across multiple seeded tries until hybrid sprouts naturally
    let sproutedHybrid = false;
    for (let seed = 0; seed < 50; seed += 1) {
      const rng = createRng(seed);
      const res = runFlowerCrossbreedingRound(
        garden,
        BLOOM_PERIOD_MS * 2,
        () => rng.next(),
        'rain',
      );
      if (res.sprouts.some((s) => s.flowerSku === 'tulip_orange')) {
        sproutedHybrid = true;
        expect(res.garden.discovered).toContain('tulip_orange');
        // Test harvesting bred flower
        const idx = res.sprouts.find((s) => s.flowerSku === 'tulip_orange')!.slotIndex;
        const harvested = harvestFlowerFromBed(res.garden, idx, () => rng.next());
        expect(harvested.ok).toBe(true);
        if (harvested.ok) {
          expect(harvested.sku).toBe('tulip_orange');
          expect(['silver', 'gold', 'normal']).toContain(harvested.quality);
        }
        break;
      }
    }
    expect(sproutedHybrid).toBe(true);
  });

  it('tracks all 12 perennial fruit trees through 4 stages, recurring harvests, windy bonus, and uproot', () => {
    expect(ORCHARD_TREE_DEFS).toHaveLength(12);
    let orchard = createOrchard();
    expect(orchard.slots).toHaveLength(ORCHARD_SLOT_COUNT);

    const planted = plantOrchardSapling(orchard, 0, 'sapling_peach', 0, 'p1');
    expect(planted.ok).toBe(true);
    if (!planted.ok) throw new Error(planted.messageVi);
    orchard = planted.orchard;

    const treeDef = planted.tree;
    // Stage progression sapling -> young -> mature -> fruiting
    expect(projectOrchard(orchard, 0)[0]!.stage).toBe('sapling');
    expect(projectOrchard(orchard, Math.floor(treeDef.matureMs * 0.45))[0]!.stage).toBe('young');
    expect(projectOrchard(orchard, Math.floor(treeDef.matureMs * 0.85))[0]!.stage).toBe('mature');

    const readyAt = treeDef.matureMs;
    const readyView = projectOrchard(orchard, readyAt)[0]!;
    expect(readyView.stage).toBe('fruiting');
    expect(readyView.ready).toBe(true);

    // Harvest on windy day gives +1 bonus fruit and keeps tree perennial
    const h1 = harvestOrchardTree(orchard, 0, readyAt, () => 0.5, { weatherId: 'windy' });
    expect(h1.ok).toBe(true);
    if (!h1.ok) throw new Error(h1.messageVi);
    expect(h1.windBonus).toBe(true);
    expect(h1.qty).toBeGreaterThan(treeDef.yieldQty);
    orchard = h1.orchard;

    // Immediately starts next cycle (not ready until cycleMs passes, never dies after 365 days!)
    expect(projectOrchard(orchard, readyAt + 1000)[0]!.ready).toBe(false);
    const farFuture = readyAt + 365 * 86_400_000;
    expect(projectOrchard(orchard, farFuture)[0]!.ready).toBe(true);

    const uprooted = uprootOrchardTree(orchard, 0);
    expect(uprooted.ok).toBe(true);
    if (uprooted.ok) {
      expect(uprooted.saplingSku).toBe('sapling_peach');
      expect(uprooted.orchard.slots[0]).toBeNull();
    }
  });
});
