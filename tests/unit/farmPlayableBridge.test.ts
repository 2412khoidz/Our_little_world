import { describe, expect, it } from 'vitest';
import {
  buildFarmSlicePlotInteractables,
  farmSliceAnchorId,
  plotIndexFromFarmAnchorId,
  PRIMARY_FARM_MAP_ID,
} from '../../src/shared/farming/farmPlayableBridge';
import { FARM_ZONE_MAP_ID, farmPlotTileFromAnchor, FARM_PLOT_REGIONS } from '../../src/shared/world/farmPlotContract';
import { GARDEN_PLOT_COUNT } from '../../src/shared/farming/crops';

describe('farmPlayableBridge', () => {
  it('uses Composer 3 farm map id', () => {
    expect(PRIMARY_FARM_MAP_ID).toBe(FARM_ZONE_MAP_ID);
    expect(PRIMARY_FARM_MAP_ID).toBe('farm');
  });

  it('maps slice plot indices to farm_main anchor ids', () => {
    expect(farmSliceAnchorId(0)).toBe('farm_main_0');
    expect(plotIndexFromFarmAnchorId('farm_main_23')).toBe(23);
    expect(plotIndexFromFarmAnchorId('garden-plot-3')).toBe(3);
  });

  it('places 24 crop interactables on contract tiles', () => {
    const plots = buildFarmSlicePlotInteractables();
    expect(plots).toHaveLength(GARDEN_PLOT_COUNT);
    const region = FARM_PLOT_REGIONS.find((r) => r.id === 'farm_main')!;
    const tile0 = farmPlotTileFromAnchor(region, 0)!;
    expect(plots[0]?.id).toBe('farm_main_0');
    expect(plots[0]?.x).toBe(tile0.tileX * 16 + 8);
  });
});