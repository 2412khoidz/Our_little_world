/** Guarded donor multi-care route (C2 expansion). Not a second save game — preview slice only. */
export function isDonorPetCareRouteEnabled(): boolean {
  if (import.meta.env.VITE_OLW_DONOR_PET_CARE === '1' || import.meta.env.VITE_OLW_DONOR_PET_CARE === 'true') {
    return true;
  }
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  return q.has('donor-pet-three') || q.has('donor-pet-care');
}