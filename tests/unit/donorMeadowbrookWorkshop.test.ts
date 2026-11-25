import { describe, expect, it } from 'vitest';
import { collectFinishedCrafts, enqueueCraft } from '../../src/shared/donor/webfarmville-c420bc2/meadowbrookWorkshopQueue';
import { OLW_MEADOWBROOK_MILL } from '../../src/shared/donor/webfarmville-c420bc2/olwMeadowbrookMill';

describe('donor meadowbrook workshop queue', () => {
  it('enqueues olw_flour and deducts wheat', () => {
    const building = { level: 1, queue: [] as { recipeId: string; endMs: number }[] };
    const now = 1_000_000;
    const queued = enqueueCraft(building, OLW_MEADOWBROOK_MILL, 'olw_flour', { wheat: 3 }, now);
    expect(queued.inventory.wheat).toBe(1);
    expect(queued.building.queue).toHaveLength(1);
    expect(queued.building.queue[0]!.recipeId).toBe('olw_flour');
    expect(queued.building.queue[0]!.endMs).toBe(now + 45_000);
  });

  it('collects finished flour into inventory map', () => {
    const end = 9_000_000;
    const building = { level: 1, queue: [{ recipeId: 'olw_flour', endMs: end }] };
    const collected = collectFinishedCrafts(building, OLW_MEADOWBROOK_MILL, end, {}, () => 0);
    expect(collected.building.queue).toHaveLength(0);
    expect(collected.inventory.flour).toBe(1);
  });
});