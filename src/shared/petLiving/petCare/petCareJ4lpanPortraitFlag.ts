/**
 * Default pet care close-up: j4lpan/pet-shop SVG (recovery @ 8e4454d).
 * Procedural `petCarePortraitPainter` opt-in only via query/env.
 */
export function petCareJ4lpanPortraitEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.get('pet-care-procedural') === '1') return false;
    if (url.searchParams.get('pet-care-j4lpan') === '0') return false;
    if (url.searchParams.get('pet-care-j4lpan') === '1') return true;
  }
  if (import.meta.env.VITE_OLW_PET_CARE_J4LPAN === '0') return false;
  if (import.meta.env.VITE_OLW_PET_CARE_PROCEDURAL === '1') return false;
  return true;
}