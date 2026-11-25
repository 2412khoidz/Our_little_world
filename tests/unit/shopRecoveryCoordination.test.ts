import { describe, expect, it } from 'vitest';
import {
  isRecoveryFarmMarketTarget,
  isRecoveryFarmToolShopTarget,
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

  it('routes cabacos tool counter to tool shop modal', () => {
    expect(shopRecoveryEntryForTarget('cabacos_interior_tool_shop_counter')?.route).toBe(
      'farm_tool_shop_modal',
    );
    expect(isRecoveryFarmToolShopTarget('cabacos_interior_tool_shop_counter')).toBe(true);
    expect(isRecoveryFarmToolShopTarget('farm_seed_shop')).toBe(false);
  });
});