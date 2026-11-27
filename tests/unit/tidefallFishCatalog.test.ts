import { describe, expect, it } from 'vitest';
import {
  matchTidefallCatalogByPreviewName,
  TIDEFALL_FISH_CATALOG,
  tidefallFishForDonorSpot,
  tidefallFishRarityLabelVi,
} from '../../src/shared/donor/tidefall-phaser/tidefallFishCatalog';

describe('tidefallFishCatalog', () => {
  it('vendors 44 species from upstream fish.json', () => {
    expect(TIDEFALL_FISH_CATALOG.length).toBe(44);
  });

  it('filters meadow pond to lake and river biomes', () => {
    const pond = tidefallFishForDonorSpot('meadow_pond');
    expect(pond.length).toBeGreaterThan(5);
    expect(pond.every((f) => f.biome === 'lake' || f.biome === 'river')).toBe(true);
  });

  it('filters gull bay toward sea species', () => {
    const bay = tidefallFishForDonorSpot('gull_bay');
    expect(bay.some((f) => f.biome === 'sea')).toBe(true);
  });

  it('maps preview names to catalog entries when possible', () => {
    const bass = matchTidefallCatalogByPreviewName('Bass');
    expect(bass?.id).toBe('bass');
    expect(tidefallFishRarityLabelVi('common')).toBe('thường');
  });
});