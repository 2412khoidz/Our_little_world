/**
 * Shared hotbar SKU policy — pet care (#13) + farming (#14) via one adapter.
 * Composer 1: append farm tool/seed SKUs to `FARM_TOOL_HOTBAR_SKUS` only (no fork of GameHotbar).
 */
import type { HeldItemKind } from './interactionTypes';

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
  if (sku.startsWith('seed_') || sku.startsWith('tool_')) return 'tool';
  if (
    sku === 'pet_kibble_basic' ||
    sku.startsWith('fish_') ||
    sku.startsWith('cat_') ||
    sku.startsWith('chicken_')
  ) {
    return 'food';
  }
  return 'tool';
}

export function isPetHandFeedSku(sku: string): boolean {
  return (
    sku === 'pet_kibble_basic' ||
    sku.startsWith('fish_') ||
    sku.startsWith('cat_broth') ||
    sku.startsWith('chicken_')
  );
}