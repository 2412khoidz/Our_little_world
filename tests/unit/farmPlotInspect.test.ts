import { describe, expect, it } from 'vitest';
import { farmPlotInspectLabelVi } from '../../src/shared/farming/farmPlotInspect';

describe('farmPlotInspect', () => {
  it('shows growth percent and ETA for growing crop', () => {
    const label = farmPlotInspectLabelVi(
      {
        plotId: 0,
        soil: 'planted',
        cropSku: 'wheat',
        plantedAtMs: 0,
        waterCount: 0,
        growthPermille: 500,
        ready: false,
        harvestReadyAtMs: 60_000,
        growthStage: 1,
      },
      30_000,
    );
    expect(label).toContain('50%');
    expect(label).toContain('Lúa mì');
    expect(label).toMatch(/còn \d+/i);
  });

  it('labels empty and tilled soil', () => {
    expect(
      farmPlotInspectLabelVi(
        {
          plotId: 1,
          soil: 'empty',
          cropSku: null,
          plantedAtMs: null,
          waterCount: 0,
          growthPermille: 0,
          ready: false,
          harvestReadyAtMs: null,
          growthStage: null,
        },
        0,
      ),
    ).toContain('cuốc');
    expect(
      farmPlotInspectLabelVi(
        {
          plotId: 1,
          soil: 'tilled',
          cropSku: null,
          plantedAtMs: null,
          waterCount: 0,
          growthPermille: 0,
          ready: false,
          harvestReadyAtMs: null,
          growthStage: 0,
        },
        0,
      ),
    ).toContain('gieo');
  });
});