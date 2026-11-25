import { isExtendedWorldBuildDefault } from '../../lib/olwPreviewProfile';

export const EXTENDED_WORLD_DEV_DATA_MARKER = 'extended-world-dev-preview';

const STORAGE_KEY = 'olw-extended-world';
const STORAGE_ON = '1';
const STORAGE_OFF = '0';

let bootstrapped = false;

function readStoragePreference(): 'on' | 'off' | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === STORAGE_ON) return 'on';
    if (raw === STORAGE_OFF) return 'off';
  } catch {
    /* ignore */
  }
  return null;
}

function bootstrapExtendedWorldFromUrl(): void {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams(window.location.search);
  if (q.get('extended-world') === '1') {
    setExtendedWorldDevPersistent(true);
  }
}

/**
 * Extended / tiled donor world (village, farm, beach…).
 * DEV: URL `?extended-world=1` or localStorage opt-in.
 * Private preview build: default ON unless user opted out (localStorage `0`).
 */
export function isExtendedWorldDevEnabled(): boolean {
  if (typeof window === 'undefined') {
    return isExtendedWorldBuildDefault();
  }

  if (!bootstrapped) {
    bootstrapped = true;
    bootstrapExtendedWorldFromUrl();
  }

  const pref = readStoragePreference();
  if (pref === 'off') return false;
  if (pref === 'on') return true;

  if (isExtendedWorldBuildDefault()) return true;

  if (!import.meta.env.DEV) return false;

  const q = new URLSearchParams(window.location.search);
  if (q.get('extended-world') === '1') return true;

  return false;
}

export function setExtendedWorldDevPersistent(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (!import.meta.env.DEV && !isExtendedWorldBuildDefault()) return;
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, STORAGE_ON);
    else window.localStorage.setItem(STORAGE_KEY, STORAGE_OFF);
  } catch {
    /* ignore */
  }
}

export function extendedWorldDevEntryUrl(): string {
  return '/?extended-world=1';
}

if (typeof window !== 'undefined') {
  bootstrapExtendedWorldFromUrl();
}