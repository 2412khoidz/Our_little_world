/**
 * Shared hotbar SKU policy — pet care (#13) + farming (#14) via one adapter.
 * Farm C1 tools: append SKUs to `FARM_TOOL_HOTBAR_SKUS` only (no fork of GameHotbar).
 */
import { isCanonicalFishSku } from '../donor/fishing/canonicalFishRegistry';
import type { HeldItemKind } from './interactionTypes';

export type ItemQualityTier = 'normal' | 'silver' | 'gold';

/** Edible / care items for PetCareScene + hand-feed authority. */
export const PET_CARE_HOTBAR_SKUS = [
  'pet_kibble_basic',
  'fish_salmon_bite',
  'fish_carp_grilled',
  'cat_broth_warm',
  'chicken_pumpkin_mash',
  'toy_yarn',
  'toy_cardboard_box',
  'water_pitcher',
] as const;

/** Farm/fish starter row for donor-reuse preview (order mirrored in hotbar adapter). */
export const FARM_TOOL_HOTBAR_SKUS = [
  'tool_hoe',
  'tool_watering_can',
  'seed_wheat',
  'seed_carrot',
  'seed_tomato',
  'rod_basic',
  'bait_free_worm',
] as const;

/** Preferred slot order when projecting inventory → 8 HUD cells. */
export const MAIN_GAME_HOTBAR_SLOT_PRIORITY = [
  'tool_hoe',
  'tool_watering_can',
  'seed_wheat',
  'seed_carrot',
  'seed_tomato',
  'rod_basic',
  'bait_free_worm',
  ...PET_CARE_HOTBAR_SKUS,
] as const;

export const MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST = [
  ...PET_CARE_HOTBAR_SKUS,
  ...FARM_TOOL_HOTBAR_SKUS,
] as const;

export type MainGameHotbarSku = (typeof MAIN_GAME_HOTBAR_INITIAL_SKU_ALLOWLIST)[number];

export function hotbarSkuToHeldKind(sku: string): HeldItemKind {
  if (sku === 'water_pitcher') return 'water_pitcher';
  if (sku.startsWith('toy_')) return 'toy';
  if (sku.startsWith('gift_') || sku.startsWith('letter_') || sku === 'rose_pink' || sku === 'rose_sakura' || sku === 'sunflower' || sku === 'sakura_bouquet') {
    return 'gift';
  }
  if (sku.startsWith('seed_') || sku.startsWith('tool_') || sku.startsWith('rod_') || sku.startsWith('bait_')) {
    return 'tool';
  }
  if (
    sku === 'pet_kibble_basic' ||
    isCanonicalFishSku(sku) ||
    sku.startsWith('fish_') ||
    sku.startsWith('cat_') ||
    sku.startsWith('chicken_')
  ) {
    return 'food';
  }
  if (
    sku === 'wheat' ||
    sku === 'carrot' ||
    sku === 'tomato' ||
    sku === 'strawberry' ||
    sku === 'cabbage' ||
    sku === 'peach' ||
    sku === 'apple' ||
    sku === 'donor_bread' ||
    sku === 'donor_egg' ||
    sku.endsWith('_soup') ||
    sku.endsWith('_tea') ||
    sku.endsWith('_tart') ||
    sku === 'herb_carp' ||
    sku === 'koinori_platter'
  ) {
    return 'food';
  }
  return 'tool';
}

export function isPetHandFeedSku(sku: string): boolean {
  return (
    sku === 'pet_kibble_basic' ||
    isCanonicalFishSku(sku) ||
    sku.startsWith('fish_') ||
    sku.startsWith('cat_broth') ||
    sku.startsWith('chicken_')
  );
}