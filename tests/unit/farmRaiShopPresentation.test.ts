import { describe, expect, it } from 'vitest';
import {
  FARM_RAI_GENERIC_SEED_ICON,
  farmRaiSeedIconUrl,
} from '../../src/shared/donor/farm-rai-2bbb65c/farmRaiShopPresentation';

describe('farmRaiShopPresentation', () => {
  it('maps known seed SKUs to vendored crop icons', () => {
    expect(farmRaiSeedIconUrl('seed_wheat')).toContain('crop-wheat.webp');
    expect(farmRaiSeedIconUrl('seed_carrot')).toContain('crop-carrot.webp');
    expect(farmRaiSeedIconUrl('seed_tomato')).toContain('crop-tomato.webp');
    expect(farmRaiSeedIconUrl('seed_strawberry')).toContain('crop-strawberry.webp');
  });

  it('falls back to generic seed art for unknown SKU', () => {
    expect(farmRaiSeedIconUrl('seed_unknown')).toBe(FARM_RAI_GENERIC_SEED_ICON);
  });
});