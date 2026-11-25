import type { MapId } from '../types';

const LEGACY_MEADOW = 'meadow';

/** Normalizes persisted / query map ids after meadow → outdoor rename (Mission 04D). */
export function normalizeMapId(raw: string | null | undefined): MapId | null {
  if (!raw) return null;
  if (raw === LEGACY_MEADOW) return 'outdoor';
  if (raw === 'home' || raw === 'garden' || raw === 'outdoor') return raw;
  return null;
}

export function isLegacyMeadowMapId(raw: string): boolean {
  return raw === LEGACY_MEADOW;
}