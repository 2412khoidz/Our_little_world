/**
 * Static j4lpan SVG center portrait — opt-in only (Worker H recovery rejects default).
 * Living close-up uses Frakassets body + illustration atlas in Phaser `PetCarePortraitRig`.
 */
export function petCareJ4lpanPortraitEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.get('pet-care-procedural') === '1') return false;
    if (url.searchParams.get('pet-care-j4lpan') === '1') return true;
    if (url.searchParams.get('pet-care-j4lpan') === '0') return false;
  }
  if (import.meta.env.VITE_OLW_PET_CARE_J4LPAN === '1') return true;
  if (import.meta.env.VITE_OLW_PET_CARE_PROCEDURAL === '1') return false;
  return false;
}