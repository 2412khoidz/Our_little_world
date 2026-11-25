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

  it('flags cabacos seed door as interior-deferred', () => {
    expect(shopRecoveryEntryForTarget('cabacos_player_seed_shop_door')?.route).toBe(
      'portal_cabacos_interior_deferred',
    );
  });
});