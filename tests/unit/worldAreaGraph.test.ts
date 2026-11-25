import { describe, expect, it } from 'vitest';
import { WORLD_AREA_WARPS_LIVE, plannedAreas } from '../../src/shared/world/worldAreaGraph';

describe('worldAreaGraph', () => {
  it('lists planned Stardew-scale regions without breaking live maps', () => {
    const planned = plannedAreas();
    expect(planned.map((a) => a.id)).toEqual(['village', 'forest', 'lake']);
    expect(planned.every((a) => a.phase === 'planned')).toBe(true);
  });

  it('documents live warps aligned with home/garden/outdoor', () => {
    expect(WORLD_AREA_WARPS_LIVE).toHaveLength(2);
    expect(WORLD_AREA_WARPS_LIVE[1]?.toAreaId).toBe('meadow');
  });
});