import type { TidefallFishBiome, TidefallFishRarity } from '../tidefall-phaser/tidefallFishCatalog';

export const FISHING_FRENZY_UPSTREAM_SHA = 'f3939a3f9855104abd55fdf9f465acd52da65c79';

const BASE = '/assets/donor/fishing-frenzy/sprites';

/** Direct Tidefall catalog id → vendored frenzy sprite basename (without path). */
const DIRECT_MAP: Record<string, string> = {
  bass: 'bass',
  catfish: 'catfish',
  guppy: 'guppy',
  pike: 'pike',
  golden_trout: 'hybrid_goldentrout',
  puffer_fish: 'pufferfish',
  manta_ray: 'manta',
  shark_greatwhite: 'shark',
  shark_hammerhead: 'shark',
  shark_saw: 'shark',
  shark_whale: 'whale',
  squid: 'squid',
  swordfish: 'swordfish',
  cherry_salmon: 'salmon',
  coho_salmon: 'salmon',
  pink_salmon: 'salmon',
  sockeye_salmon: 'salmon',
  rainbow_fish: 'hybrid_rainbow',
  oarfish: 'leviathan',
  mahi_mahi: 'marlin',
  giant_tevally: 'tuna',
  char: 'trout',
  loach: 'carp',
  neon_tetras: 'goldfish',
  pirana: 'pike',
  silver_eel: 'squid',
};

const BIOME_FALLBACK: Record<TidefallFishBiome, string> = {
  lake: 'bass',
  river: 'trout',
  sea: 'tuna',
};

const RARITY_FALLBACK: Record<TidefallFishRarity, string> = {
  common: 'guppy',
  uncommon: 'tilapia',
  rare: 'pufferfish',
  epic: 'swordfish',
  legendary: 'leviathan',
};

export function fishingFrenzySpritePathForFish(
  fishId: string,
  opts?: { biome?: TidefallFishBiome; rarity?: TidefallFishRarity },
): string {
  const normalized = fishId.trim().toLowerCase();
  const file = DIRECT_MAP[normalized] ?? BIOME_FALLBACK[opts?.biome ?? 'lake'] ?? RARITY_FALLBACK[opts?.rarity ?? 'common'];
  return `${BASE}/${file}.png`;
}

export const FISHING_FRENZY_FISHER = {
  idle: `${BASE}/fisher_idle.png`,
  cast: `${BASE}/fisher_cast.png`,
  reel: `${BASE}/fisher_reel.png`,
} as const;

export const FISHING_FRENZY_BOBBER = `${BASE}/bobber.png`;
export const FISHING_FRENZY_ROD = `${BASE}/rod.png`;

export type FishingFrenzyFisherPhase = 'idle' | 'cast' | 'reel';

export function fishingFrenzyFisherSrc(phase: FishingFrenzyFisherPhase): string {
  if (phase === 'cast') return FISHING_FRENZY_FISHER.cast;
  if (phase === 'reel') return FISHING_FRENZY_FISHER.reel;
  return FISHING_FRENZY_FISHER.idle;
}