import { describe, expect, it } from 'vitest';
import {
  FARM_PLOT_COUNT,
  farmPlotAnchorIdForIndex,
  isFarmPlotIndexOnContractSoil,
  plotIndexFromAnchorId,
} from '../../src/shared/farming/farmPlotIndex';

describe('farmPlotIndex', () => {
  it('maps 184 contract anchors', () => {
    expect(FARM_PLOT_COUNT).toBe(184);
    expect(farmPlotAnchorIdForIndex(0)).toBe('farm_main_0');
    expect(farmPlotAnchorIdForIndex(119)).toBe('farm_main_119');
    expect(farmPlotAnchorIdForIndex(120)).toBe('farm_annex_0');
    expect(plotIndexFromAnchorId('farm_annex_63')).toBe(183);
  });

  it('rejects out-of-contract indices', () => {
    expect(isFarmPlotIndexOnContractSoil(0)).toBe(true);
    expect(isFarmPlotIndexOnContractSoil(120)).toBe(true);
    expect(isFarmPlotIndexOnContractSoil(999)).toBe(false);
  });
});