import { petCareJ4lpanPortraitEnabled } from './petCareJ4lpanPortraitFlag';

/**
 * Phase II — 48px care illustration atlas (not 16px overworld blow-up).
 * Default on when j4lpan SVG portrait is off (`?pet-care-illustration=0` → Frakassets 16px scale).
 */
export function petCareIllustrationAtlasEnabled(): boolean {
  if (petCareJ4lpanPortraitEnabled()) return false;
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.get('pet-care-illustration') === '0') return false;
    if (url.searchParams.get('pet-care-illustration') === '1') return true;
  }
  if (import.meta.env.VITE_OLW_PET_CARE_ILLUSTRATION === '0') return false;
  if (import.meta.env.VITE_OLW_PET_CARE_ILLUSTRATION === '1') return true;
  return true;
}

export const PET_CARE_ILLUSTRATION_DISPLAY_SCALE = 3;