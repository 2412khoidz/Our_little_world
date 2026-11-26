/**
 * Pure TypeScript SKU -> Hybrid Art Direction sprite URL resolver.
 * Uses Kiln Harvest Free Sampler crisp 16x16 item icons, Fishing Frenzy fish sprites, and Sprout Lands emotes.
 */
import { fishSpriteUrlForSku } from '../donor/fishing/canonicalFishRegistry';

const BASE = '/assets/ui/hybrid/items';
const EMOTES = '/assets/ui/hybrid/emotes';

export const KILN_SKU_ICON_URLS: Readonly<Record<string, string>> = {
  tool_hoe: `${BASE}/hoe_basic.png`,
  tool_watering_can: `${BASE}/watering_can_basic.png`,
  rod_basic: `${BASE}/fishing_rod_basic.png`,
  tool_axe: `${BASE}/axe_basic.png`,
  tool_shovel: `${BASE}/shovel_basic.png`,

  seed_wheat: `${BASE}/seeds_wheat.png`,
  seed_carrot: `${BASE}/seeds_carrot.png`,
  seed_tomato: `${BASE}/seeds_tomato.png`,
  seed_strawberry: `${BASE}/seeds_strawberry.png`,
  seed_sunflower: `${BASE}/seeds_corn.png`,
  seed_rose_pink: `${BASE}/seeds_turnip.png`,
  seed_cabbage: `${BASE}/seeds_potato.png`,
  seed_corn: `${BASE}/seeds_corn.png`,
  seed_potato: `${BASE}/seeds_potato.png`,
  seed_pumpkin: `${BASE}/seeds_pumpkin.png`,

  wheat: `${BASE}/wheat.png`,
  carrot: `${BASE}/carrot.png`,
  tomato: `${BASE}/tomato.png`,
  strawberry: `${BASE}/strawberry.png`,
  apple: `${BASE}/apple.png`,
  corn: `${BASE}/corn.png`,
  potato: `${BASE}/potato.png`,
  pumpkin: `${BASE}/pumpkin.png`,
  peach: `${BASE}/apple.png`,
  rose_pink: `${EMOTES}/flower.png`,
  rose_sakura: `${EMOTES}/flower.png`,
  sunflower: `${EMOTES}/sprout.png`,
  cabbage: `${BASE}/hay.png`,

  sugar_pack: `${BASE}/seed_pouch.png`,
  spice: `${BASE}/energy_potion.png`,
  strawberry_jam: `${BASE}/gift_box.png`,
  flour: `${BASE}/wheat.png`,
  ribbon: `${BASE}/letter.png`,
  wild_herb: `${EMOTES}/clover.png`,
  wood_branch: `${BASE}/wood.png`,
  wood_chair: `${BASE}/wood.png`,

  bait_free_worm: `${EMOTES}/clover.png`,
  bait_shrimp: `${EMOTES}/sprout.png`,

  egg_white: `${BASE}/egg_white.png`,
  milk: `${BASE}/milk.png`,
  carrot_soup: `${BASE}/carrot.png`,
  peach_tea: `${BASE}/energy_potion.png`,
  strawberry_tart: `${BASE}/strawberry.png`,
  herb_carp: '/assets/donor/fishing-frenzy/sprites/carp.png',
  koinori_platter: '/assets/donor/fishing-frenzy/sprites/goldfish.png',
  sakura_bouquet: `${EMOTES}/flower.png`,

  coin: `${BASE}/coin.png`,
  coin_stack: `${BASE}/coin_stack.png`,

  water_pitcher: `${BASE}/watering_can_basic.png`,
  toy_yarn: `${EMOTES}/cat_love.png`,
  toy_cardboard_box: `${BASE}/gift_box.png`,
  pet_kibble_basic: `${BASE}/seed_pouch.png`,
  letter_stationery_pink: `${BASE}/letter.png`,
  gift_flower_bouquet: `${EMOTES}/flower.png`,
  gift_strawberry_cake: `${BASE}/strawberry.png`,
  gift_plush_cat: `${EMOTES}/cat_love.png`,
  gift_star_jar: `${EMOTES}/star.png`,
  donor_bread: `${BASE}/wheat.png`,
  donor_egg: `${BASE}/egg_white.png`,
  chicken_feed: `${BASE}/hay.png`,
};

export function kilnItemIconUrlForSku(sku: string): string | null {
  const colon = sku.indexOf(':');
  const base = colon >= 0 ? sku.slice(0, colon) : sku;
  const fishUrl = fishSpriteUrlForSku(base);
  if (fishUrl) return fishUrl;
  return KILN_SKU_ICON_URLS[base] ?? null;
}

export const SCRAPBOOK_PIXEL_STICKER_URLS: Readonly<Record<string, string>> = {
  '❤️': `${EMOTES}/heart.png`,
  '🌸': `${EMOTES}/flower.png`,
  '🐱': `${EMOTES}/cat_love.png`,
  '✨': `${EMOTES}/star.png`,
  '📎': `${BASE}/letter.png`,
  '🦋': `${EMOTES}/clover.png`,
  '☕': `${EMOTES}/sprout.png`,
  '🌙': `${EMOTES}/moon.png`,
};

export const COUPLE_EMOTE_PIXEL_URLS: Readonly<Record<string, string>> = {
  heart: `${EMOTES}/heart.png`,
  wave: `${EMOTES}/thumbs_up.png`,
  sleepy: `${EMOTES}/cat_sleep.png`,
  cheer: `${EMOTES}/star.png`,
  miss_you: `${EMOTES}/hearts_double.png`,
};
