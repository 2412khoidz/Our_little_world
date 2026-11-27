import type { MapId } from '../types';

const LEGACY_MEADOW = 'meadow';

/** Normalizes persisted / query map ids after meadow → outdoor rename (Mission 04D). */
export function normalizeMapId(raw: string | null | undefined): MapId | null {
  if (!raw) return null;
  if (raw === LEGACY_MEADOW) return 'village';
  if (
    raw === 'home' ||
    raw === 'garden' ||
    raw === 'outdoor' ||
    raw === 'village' ||
    raw === 'farm' ||
    raw === 'forest' ||
    raw === 'beach' ||
    raw === 'shop' ||
    raw === 'shop_seed' ||
    raw === 'shop_tool' ||
    raw === 'shop_crop_market' ||
    raw === 'shop_town_hall'
  ) {
    return raw;
  }
  return null;
}

export function isLegacyMeadowMapId(raw: string): boolean {
  return raw === LEGACY_MEADOW;
}