import { describe, expect, it } from 'vitest';
import { propsIconIdForCatalogSku } from '../../src/shared/art/catalogSkuPropsIcon';

describe('CatalogSkuIcon SKU resolution', () => {
  it('maps shop seed SKUs to props manifest ids', () => {
    expect(propsIconIdForCatalogSku('seed_wheat')).toBe('prop.corn');
    expect(propsIconIdForCatalogSku('seed_tomato')).toBe('prop.tomato');
  });

  it('maps crop ship keys without quality suffix', () => {
    const sku = 'wheat:silver'.split(':')[0]!;
    expect(propsIconIdForCatalogSku(sku)).toBe('prop.corn');
  });
});