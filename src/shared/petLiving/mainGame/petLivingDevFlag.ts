/** DOM marker for E2E / owner — must stay out of production bundles (see verify-prod-guard). */
export const LIVING_PET_LOCAL_SIM_DATA_MARKER = 'living-pet-local-sim';

const STORAGE_KEY = 'olw-living-pet';

export function isLivingPetLocalSimulationEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(window.location.search);
    const flag = q.get('living-pet');
    if (flag === '0') return false;
    if (flag === '1') return true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === '0') return false;
      if (stored === '1') return true;
    } catch {
      /* ignore */
    }
    return true;
  }
  return true;
}

export function setLivingPetLocalSimulationPersistent(enabled: boolean): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function livingPetDevEntryUrl(): string {
  return import.meta.env.DEV ? '/?living-pet=1' : '/';
}