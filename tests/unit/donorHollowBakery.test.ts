import { describe, expect, it } from 'vitest';
import { enqueueCraft, collectFinishedCrafts } from '../../src/shared/donor/webfarmville-c420bc2/meadowbrookWorkshopQueue';
import { OLW_HOLLOW_BAKERY } from '../../src/shared/donor/harvest-hollow-9b23e1a/olwHollowBakery';

describe('donor hollow bakery queue', () => {
  it('bakes bread from flour', () => {
    const building = { level: 1, queue: [] as { recipeId: string; endMs: number }[] };
    const end = 5_000_000;
    const queued = enqueueCraft(building, OLW_HOLLOW_BAKERY, 'olw_bread', { flour: 2 }, 0);
    expect(queued.inventory.flour).toBe(1);
    const collected = collectFinishedCrafts(
      { ...queued.building, queue: [{ recipeId: 'olw_bread', endMs: end }] },
      OLW_HOLLOW_BAKERY,
      end,
      queued.inventory,
      () => 0,
    );
    expect(collected.inventory.donor_bread).toBe(1);
  });
});