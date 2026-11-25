/**
 * Phase II — 48px care illustration atlas (not 16px overworld blow-up).
 * Default on in dev; production stays on licensed sheet until art sign-off.
 */
export function petCareIllustrationAtlasEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.get('pet-care-illustration') === '0') return false;
    if (url.searchParams.get('pet-care-illustration') === '1') return true;
  }
  if (import.meta.env.VITE_OLW_PET_CARE_ILLUSTRATION === '1') return true;
  return import.meta.env.DEV;
}

export const PET_CARE_ILLUSTRATION_DISPLAY_SCALE = 2.75;