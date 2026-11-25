import { describe, expect, it } from 'vitest';
import { FARM_STATE_CONTRACT_VERSION, FARM_STATE_PLOT_BINDING } from '../../src/shared/farming/farmAuthorityConstants';
import { FARM_PLOT_CONTRACT_VERSION } from '../../src/shared/world/farmPlotContract';

describe('farmAuthorityConstants', () => {
  it('binds simulation to Composer 3 contract v1.0.0', () => {
    expect(FARM_STATE_CONTRACT_VERSION).toBe('1.0.0');
    expect(FARM_PLOT_CONTRACT_VERSION).toBe(FARM_STATE_CONTRACT_VERSION);
    expect(FARM_STATE_PLOT_BINDING).toBe('farm_main:0-23');
  });
});