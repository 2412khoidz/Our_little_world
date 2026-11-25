import { describe, expect, it } from 'vitest';
import { getProfile } from '../../src/shared/economy/sim/config';
import {
  FARM_CONTRACT_PLOT_COUNT,
  applyPlotCountOverride,
  parseSimPlotsArg,
} from '../../src/shared/economy/sim/plotCount';
import { compareStrategies, runSimulation } from '../../src/shared/economy/sim/run';

describe('sim plotCount override', () => {
  it('parses contract and sample plot flags', () => {
    expect(parseSimPlotsArg('')).toBeUndefined();
    expect(parseSimPlotsArg('184')).toBe(FARM_CONTRACT_PLOT_COUNT);
    expect(parseSimPlotsArg('contract')).toBe(FARM_CONTRACT_PLOT_COUNT);
    expect(parseSimPlotsArg('sample:24')).toBe(24);
    expect(parseSimPlotsArg('sample:999')).toBe(FARM_CONTRACT_PLOT_COUNT);
  });

  it('applies override only on farming profiles', () => {
    const v020 = applyPlotCountOverride(getProfile('v020'), 184);
    expect(v020.plotCount).toBe(0);
    const v021 = applyPlotCountOverride(getProfile('v021'), 184);
    expect(v021.plotCount).toBe(184);
  });

  it('runs v021 with 184 plots without invariant failure (short)', () => {
    const result = runSimulation({
      seed: 42,
      profileId: 'v021',
      personaId: 'coop',
      days: 7,
      plotCountOverride: FARM_CONTRACT_PLOT_COUNT,
    });
    expect(result.invariants.ok).toBe(true);
    const cmp = compareStrategies({
      seed: 42,
      profileId: 'v021',
      personaId: 'coop',
      days: 7,
      plotCountOverride: FARM_CONTRACT_PLOT_COUNT,
    });
    expect(cmp.ratio).toBeGreaterThan(0);
  });
});