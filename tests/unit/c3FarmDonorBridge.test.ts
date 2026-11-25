import { describe, expect, it } from 'vitest';
import { C3_FARM_DONOR_ALIGNMENT, DONOR_PREVIEW_SKUS } from '../../src/shared/donor/adapter/c3FarmDonorBridge';

describe('C3 farm donor bridge (prep)', () => {
  it('lists preview SKUs and contract version for integration gate', () => {
    expect(C3_FARM_DONOR_ALIGNMENT.blockedByP0Render).toBe(true);
    expect(DONOR_PREVIEW_SKUS).toContain('donor_bread');
    expect(C3_FARM_DONOR_ALIGNMENT.farmPlotContractVersion).toMatch(/^\d+\.\d+/);
  });
});