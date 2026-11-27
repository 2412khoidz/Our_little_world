export type Billiards3DShotCameraMode = 'adaptive' | 'overview' | 'manual';

export interface BilliardsTouchPreferences {
  aimSensitivityPct: number;
  lockedFineSensitivityPct: number;
  cameraRotationSensitivityPct: number;
  pinchZoomSensitivityPct: number;
  /**
   * Explicit user override for 3D shot camera behavior, or `null` to follow
   * viewport default (`'adaptive'` on mobile, `'manual'` on desktop).
   */
  shotCameraMode: Billiards3DShotCameraMode | null;
}

export const TOUCH_PREF_LIMITS = {
  aimSensitivityPct: { min: 10, max: 200, default: 65, step: 5 },
  lockedFineSensitivityPct: { min: 5, max: 100, default: 30, step: 5 },
  cameraRotationSensitivityPct: { min: 10, max: 200, default: 75, step: 5 },
  pinchZoomSensitivityPct: { min: 10, max: 200, default: 80, step: 5 },
} as const;

export const TOUCH_PREFS_STORAGE_KEY = 'olw.billiards.touchCameraPrefs.v1';

const listeners = new Set<() => void>();

export function isLikelyMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  const minDim = Math.min(w, h);
  const maxTouch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return w <= 720 || minDim <= 520 || (maxTouch > 0 && (coarsePointer || w <= 1024));
}

export function createDefaultTouchPreferences(): BilliardsTouchPreferences {
  return {
    aimSensitivityPct: TOUCH_PREF_LIMITS.aimSensitivityPct.default,
    lockedFineSensitivityPct: TOUCH_PREF_LIMITS.lockedFineSensitivityPct.default,
    cameraRotationSensitivityPct: TOUCH_PREF_LIMITS.cameraRotationSensitivityPct.default,
    pinchZoomSensitivityPct: TOUCH_PREF_LIMITS.pinchZoomSensitivityPct.default,
    shotCameraMode: null,
  };
}

export function clampPrefPct(
  value: unknown,
  limits: { min: number; max: number; default: number },
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return limits.default;
  return Math.max(limits.min, Math.min(limits.max, Math.round(n)));
}

function sanitizeShotCameraMode(value: unknown): Billiards3DShotCameraMode | null {
  if (value === 'adaptive' || value === 'overview' || value === 'manual') {
    return value;
  }
  return null;
}

export function sanitizeTouchPreferences(
  raw: Partial<BilliardsTouchPreferences> | null | undefined,
): BilliardsTouchPreferences {
  if (!raw || typeof raw !== 'object') {
    return createDefaultTouchPreferences();
  }
  return {
    aimSensitivityPct: clampPrefPct(
      raw.aimSensitivityPct,
      TOUCH_PREF_LIMITS.aimSensitivityPct,
    ),
    lockedFineSensitivityPct: clampPrefPct(
      raw.lockedFineSensitivityPct,
      TOUCH_PREF_LIMITS.lockedFineSensitivityPct,
    ),
    cameraRotationSensitivityPct: clampPrefPct(
      raw.cameraRotationSensitivityPct,
      TOUCH_PREF_LIMITS.cameraRotationSensitivityPct,
    ),
    pinchZoomSensitivityPct: clampPrefPct(
      raw.pinchZoomSensitivityPct,
      TOUCH_PREF_LIMITS.pinchZoomSensitivityPct,
    ),
    shotCameraMode: sanitizeShotCameraMode(raw.shotCameraMode),
  };
}

export function resolveEffectiveShotCameraMode(
  prefs: Pick<BilliardsTouchPreferences, 'shotCameraMode'>,
  isMobile = isLikelyMobileViewport(),
): Billiards3DShotCameraMode {
  if (prefs.shotCameraMode) return prefs.shotCameraMode;
  return isMobile ? 'adaptive' : 'manual';
}

export function normalizeSensitivityMultipliers(prefs: BilliardsTouchPreferences) {
  return {
    aimMul: prefs.aimSensitivityPct / 100,
    lockedFineMul: prefs.lockedFineSensitivityPct / 100,
    cameraRotateMul: prefs.cameraRotationSensitivityPct / 100,
    pinchZoomMul: prefs.pinchZoomSensitivityPct / 100,
  };
}

export function loadTouchPreferences(): BilliardsTouchPreferences {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultTouchPreferences();
  }
  try {
    const raw = window.localStorage.getItem(TOUCH_PREFS_STORAGE_KEY);
    if (!raw) return createDefaultTouchPreferences();
    const parsed = JSON.parse(raw) as Partial<BilliardsTouchPreferences>;
    return sanitizeTouchPreferences(parsed);
  } catch {
    return createDefaultTouchPreferences();
  }
}

export function saveTouchPreferences(next: BilliardsTouchPreferences): BilliardsTouchPreferences {
  const sanitized = sanitizeTouchPreferences(next);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(TOUCH_PREFS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Ignore storage quota errors
    }
  }
  listeners.forEach((cb) => cb());
  return sanitized;
}

export function resetTouchPreferences(): BilliardsTouchPreferences {
  return saveTouchPreferences(createDefaultTouchPreferences());
}

export function subscribeTouchPreferences(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOUCH_PREFS_STORAGE_KEY) {
      listener();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}
