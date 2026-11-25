export const EXTENDED_WORLD_DEV_DATA_MARKER = 'extended-world-dev-preview';

const STORAGE_KEY = 'olw-extended-world';

/** Owner private preview dev: Cabacos/Hollowmere without requiring `?extended-world=1` every visit. */
function isPrivatePreviewExtendedDefault(): boolean {
  return import.meta.env.DEV === true && import.meta.env.VITE_OLW_PRIVATE_ART === true;
}

export function isExtendedWorldDevEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  if (isPrivatePreviewExtendedDefault()) return true;
  const q = new URLSearchParams(window.location.search);
  if (q.get('extended-world') === '1') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setExtendedWorldDevPersistent(enabled: boolean): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function extendedWorldDevEntryUrl(): string {
  return '/?extended-world=1';
}