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
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  const q = new URLSearchParams(window.location.search);
  const flag = q.get('extended-world');
  if (flag === '1') {
    setExtendedWorldDevPersistent(true);
  } else if (flag === '0') {
    setExtendedWorldDevPersistent(false);
  }
}

/**
 * Extended / tiled donor world (village, farm, beach…).
 * Canonical main game default: ON (`/` renders the full connected world).
 * DEV lab can still opt out with `?extended-world=0`.
 */
export function isExtendedWorldDevEnabled(): boolean {
  if (typeof window === 'undefined') {
    return isExtendedWorldBuildDefault();
  }

  if (!import.meta.env.DEV) {
    return isExtendedWorldBuildDefault();
  }

  if (!bootstrapped) {
    bootstrapped = true;
    bootstrapExtendedWorldFromUrl();
  }

  const q = new URLSearchParams(window.location.search);
  const flag = q.get('extended-world');
  if (flag === '0') return false;
  if (flag === '1') return true;

  const pref = readStoragePreference();
  if (pref === 'off') return false;
  if (pref === 'on') return true;

  return isExtendedWorldBuildDefault();
}

export function setExtendedWorldDevPersistent(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (!import.meta.env.DEV) return;
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, STORAGE_ON);
    else window.localStorage.setItem(STORAGE_KEY, STORAGE_OFF);
  } catch {
    /* ignore */
  }
}

export function extendedWorldDevEntryUrl(): string {
  return import.meta.env.DEV ? '/?extended-world=1' : '/';
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  bootstrapExtendedWorldFromUrl();
}