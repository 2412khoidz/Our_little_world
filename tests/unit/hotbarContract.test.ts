import { describe, expect, it } from 'vitest';
import {
  FARM_TOOL_HOTBAR_SKUS,
  PET_CARE_HOTBAR_SKUS,
  hotbarSkuToHeldKind,
  isPetHandFeedSku,
} from '../../src/shared/interaction/hotbarContract';

describe('hotbarContract', () => {
  it('keeps pet SKUs hand-feed eligible', () => {
    for (const sku of PET_CARE_HOTBAR_SKUS) {
      if (sku.startsWith('toy_') || sku === 'water_pitcher') continue;
      expect(isPetHandFeedSku(sku)).toBe(true);
    }
  });

  it('maps toy and water kinds', () => {
    expect(hotbarSkuToHeldKind('toy_yarn')).toBe('toy');
    expect(hotbarSkuToHeldKind('water_pitcher')).toBe('water_pitcher');
    expect(FARM_TOOL_HOTBAR_SKUS).toEqual([]);
  });
});