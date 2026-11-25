import { petCareJ4lpanPortraitEnabled } from './petCareJ4lpanPortraitFlag';

/**
 * Phase II — 48px care illustration atlas (not 16px overworld blow-up).
 * Retired as default when j4lpan portrait is on (recovery @ 8e4454d).
 */
export function petCareIllustrationAtlasEnabled(): boolean {
  if (petCareJ4lpanPortraitEnabled()) return false;
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.get('pet-care-illustration') === '0') return false;
    if (url.searchParams.get('pet-care-illustration') === '1') return true;
  }
  if (import.meta.env.VITE_OLW_PET_CARE_ILLUSTRATION === '1') return true;
  return import.meta.env.DEV;
}

export const PET_CARE_ILLUSTRATION_DISPLAY_SCALE = 3;