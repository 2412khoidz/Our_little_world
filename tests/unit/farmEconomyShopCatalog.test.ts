import { describe, expect, it } from 'vitest';
import { FARM_SHOP_SEED_SKUS } from '../../src/shared/farming/farmShipping';
import { propsIconIdForCatalogSku } from '../../src/shared/art/catalogSkuPropsIcon';
import { requireItem } from '../../src/shared/economy/catalogConfig';

describe('farm economy shop catalog icons', () => {
  it('every listed seed has props icon + store buy price', () => {
    for (const seedSku of FARM_SHOP_SEED_SKUS) {
      expect(propsIconIdForCatalogSku(seedSku), seedSku).toBeTruthy();
      const def = requireItem(seedSku);
      expect(def.storeBuy ?? 0, seedSku).toBeGreaterThan(0);
    }
  });
});