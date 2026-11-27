import catalog from './tidefallFishCatalog.v1.json';

export const TIDEFALL_FISH_UPSTREAM_SHA = catalog.upstreamSha;

export type TidefallFishRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type TidefallFishBiome = 'lake' | 'river' | 'sea';

export interface TidefallFishEntry {
  readonly id: string;
  readonly name: string;
  readonly rarity: TidefallFishRarity;
  readonly biome: TidefallFishBiome;
  readonly size: string;
  readonly difficulty: number;
}

const ALL_FISH: readonly TidefallFishEntry[] = Object.freeze(catalog.fish as TidefallFishEntry[]);

export const TIDEFALL_FISH_CATALOG: readonly TidefallFishEntry[] = ALL_FISH;

const BIOME_BY_SPOT: Record<'meadow_pond' | 'gull_bay', TidefallFishBiome[]> = {
  meadow_pond: ['lake', 'river'],
  gull_bay: ['sea', 'river'],
};

export function tidefallFishForDonorSpot(spotId: 'meadow_pond' | 'gull_bay'): TidefallFishEntry[] {
  const allowed = new Set(BIOME_BY_SPOT[spotId]);
  return ALL_FISH.filter((f) => allowed.has(f.biome));
}

const RARITY_VI: Record<TidefallFishRarity, string> = {
  common: 'thường',
  uncommon: 'khá hiếm',
  rare: 'hiếm',
  epic: 'rất hiếm',
  legendary: 'huyền thoại',
};

export function tidefallFishRarityLabelVi(rarity: TidefallFishRarity): string {
  return RARITY_VI[rarity] ?? rarity;
}

/** Loose match meadowbrook preview names to Tidefall catalog (presentation only). */
export function matchTidefallCatalogByPreviewName(previewName: string): TidefallFishEntry | null {
  const key = previewName.trim().toLowerCase().replace(/\s+/g, '_');
  const exact = ALL_FISH.find((f) => f.id === key || f.name.toLowerCase() === previewName.trim().toLowerCase());
  if (exact) return exact;
  return ALL_FISH.find((f) => previewName.toLowerCase().includes(f.name.toLowerCase())) ?? null;
}