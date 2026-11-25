import { describe, expect, it } from 'vitest';
import { requireItem } from '../../src/shared/economy/catalogConfig';
import { buildFarmProductionChainV1 } from '../../src/shared/economy/farmProductionChainV1';
import { FARM_CONTRACT_PLOT_COUNT } from '../../src/shared/economy/sim/plotCount';

describe('farmProductionChainV1', () => {
  it('documents a closed loop with catalog-backed SKUs', () => {
    const chain = buildFarmProductionChainV1();
    expect(chain.plotCount).toBe(FARM_CONTRACT_PLOT_COUNT);
    expect(chain.steps.map((s) => s.id)).toEqual([
      'acquire_seed',
      'till',
      'plant',
      'water',
      'harvest',
      'sell_ship',
      'wallet_credit',
    ]);
    for (const sku of [chain.starterSeedSku, ...chain.shopSeedSkus]) {
      expect(() => requireItem(sku)).not.toThrow();
    }
    expect(chain.starterToolSkus).toContain('tool_hoe');
  });
});