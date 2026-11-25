import { describe, expect, it } from 'vitest';
import {
  isRecoveryFarmMarketTarget,
  shopRecoveryEntryForTarget,
} from '../../src/shared/world/shopRecoveryCoordination';

describe('shopRecoveryCoordination', () => {
  it('routes farm seed stall to modal during recovery', () => {
    const e = shopRecoveryEntryForTarget('farm_seed_shop');
    expect(e?.route).toBe('farm_market_modal');
    expect(isRecoveryFarmMarketTarget('farm_seed_shop')).toBe(true);
  });

  it('routes cabacos interior seed counter to farm market', () => {
    expect(shopRecoveryEntryForTarget('cabacos_player_seed_shop_door')?.route).toBe('farm_market_modal');
  });
});