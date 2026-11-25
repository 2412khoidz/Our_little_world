/** DOM marker for E2E / owner — must stay out of production bundles (see verify-prod-guard). */
export const LIVING_PET_LOCAL_SIM_DATA_MARKER = 'living-pet-local-sim';

const STORAGE_KEY = 'olw-living-pet';

export function isLivingPetLocalSimulationEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  if (q.get('living-pet') === '1') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLivingPetLocalSimulationPersistent(enabled: boolean): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function livingPetDevEntryUrl(): string {
  return '/?living-pet=1';
}