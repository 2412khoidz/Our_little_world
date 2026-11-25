import { describe, expect, it } from 'vitest';
import { fishingFrenzyFisherSrc, fishingFrenzySpritePathForFish } from '../../src/shared/donor/fishing-frenzy/fishingFrenzySpriteMap';
import { tidefallFishNameVi } from '../../src/shared/donor/fishing-frenzy/fishingFrenzyFishVi';
import { matchTidefallCatalogByPreviewName } from '../../src/shared/donor/tidefall-phaser/tidefallFishCatalog';

describe('fishing-frenzy presentation map', () => {
  it('maps direct catalog ids to vendored sprite paths', () => {
    expect(fishingFrenzySpritePathForFish('bass')).toContain('/bass.png');
    expect(fishingFrenzySpritePathForFish('puffer_fish')).toContain('/pufferfish.png');
  });

  it('falls back by biome when id unknown', () => {
    expect(fishingFrenzySpritePathForFish('unknown_river', { biome: 'river' })).toContain('/trout.png');
    expect(fishingFrenzySpritePathForFish('unknown_sea', { biome: 'sea' })).toContain('/tuna.png');
  });

  it('exposes fisher phase sprite urls', () => {
    expect(fishingFrenzyFisherSrc('cast')).toContain('fisher_cast.png');
    expect(fishingFrenzyFisherSrc('reel')).toContain('fisher_reel.png');
  });

  it('provides Vietnamese labels for catalog species', () => {
    const bass = matchTidefallCatalogByPreviewName('Bass')!;
    expect(tidefallFishNameVi(bass.id, bass.name)).toBe('Cá vược');
  });
});