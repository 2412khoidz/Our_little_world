import type { TidefallFishRarity } from '../tidefall-phaser/tidefallFishCatalog';

/** Border colors adapted from fishing-frenzy FishRenderer card accents. */
export const FISHING_FRENZY_RARITY_BORDER: Record<TidefallFishRarity, string> = {
  common: '#78909c',
  uncommon: '#66bb6a',
  rare: '#42a5f5',
  epic: '#ab47bc',
  legendary: '#ffb300',
};

export function fishingFrenzyRarityGlow(rarity: TidefallFishRarity): string {
  if (rarity === 'legendary') return '0 0 14px rgba(255,179,0,0.45)';
  if (rarity === 'epic') return '0 0 10px rgba(171,71,188,0.35)';
  return 'none';
}