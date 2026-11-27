import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  computeHotbarDisplayStrategy,
  nextFullscreenOwnerOnEnter,
  nextFullscreenOwnerOnExit,
  resolveHudLayoutMode,
  shouldExitFullscreenOnMinigameClose,
  shouldShowManualRotateHint,
  type FullscreenOwner,
  type HotbarDisplayStrategy,
  type HudLayoutMode,
  type JoystickMode,
  type ManualRotateHint,
  type OrientationPreference,
  type ViewportMetrics,
} from '../../shared/viewport/viewportPolicy';

const STORAGE_ORIENTATION_KEY = 'olw:orientation-pref:v1';
const STORAGE_JOYSTICK_MODE_KEY = 'olw:joystick-mode:v1';
const STORAGE_JOYSTICK_VISIBLE_KEY = 'olw:joystick-visible:v1';

export interface FocusModeState {
  isFullscreen: boolean;
  isFocusExpanded: boolean;
  canNativeFullscreen: boolean;
  viewportHeightPx: number | null;
  toggleFocusOrFullscreen: () => void;
}

export interface GlobalViewportContextValue {
  layoutMode: HudLayoutMode;
  metrics: ViewportMetrics;
  hotbarStrategy: HotbarDisplayStrategy;
  isFullscreen: boolean;
  isFocusExpanded: boolean;
  isFullscreenOrExpanded: boolean;
  fullscreenOwner: FullscreenOwner;
  canNativeFullscreen: boolean;
  canLockOrientation: boolean;
  orientationPreference: OrientationPreference;
  manualRotateHint: ManualRotateHint;
  joystickMode: JoystickMode;
  joystickEnabled: boolean;
  setOrientationPreference: (pref: OrientationPreference) => void;
  setJoystickMode: (mode: JoystickMode) => void;
  setJoystickEnabled: (enabled: boolean) => void;
  toggleJoystickEnabled: () => void;
  toggleAppFullscreen: () => void;
  enterAppFullscreen: () => void;
  exitAppFullscreen: () => void;
  requestMinigameFocus: (minigameId: string, targetEl?: HTMLElement | null) => void;
  releaseMinigameFocus: (minigameId: string) => void;
}

const GlobalViewportContext = createContext<GlobalViewportContextValue | null>(null);

function detectIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
  return isIos;
}

function detectStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

function readViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      width: 1280,
      height: 720,
      isCoarsePointer: false,
      hasTouch: false,
      isStandalonePwa: false,
      isIosSafari: false,
    };
  }
  const vv = window.visualViewport;
  const width = Math.round(vv?.width ?? window.innerWidth);
  const height = Math.round(vv?.height ?? window.innerHeight);
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches === true;
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window;
  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
    isCoarsePointer,
    hasTouch,
    isStandalonePwa: detectStandalonePwa(),
    isIosSafari: detectIosSafari(),
  };
}

function readStoredOrientationPreference(): OrientationPreference {
  try {
    const raw = window.localStorage.getItem(STORAGE_ORIENTATION_KEY);
    if (raw === 'portrait' || raw === 'landscape' || raw === 'auto') return raw;
  } catch {
    // ignore storage errors
  }
  return 'auto';
}

function readStoredJoystickMode(): JoystickMode {
  try {
    const raw = window.localStorage.getItem(STORAGE_JOYSTICK_MODE_KEY);
    if (raw === 'floating' || raw === 'fixed') return raw;
  } catch {
    // ignore storage errors
  }
  return 'fixed';
}

function readStoredJoystickOverride(): boolean | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_JOYSTICK_VISIBLE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    // ignore storage errors
  }
  return null;
}

function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function detectNativeFullscreenSupport(): boolean {
  if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') return false;
  const doc = document as Document & { webkitFullscreenEnabled?: boolean };
  const proto = HTMLElement.prototype as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  const enabled = Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  const hasRequest =
    typeof proto.requestFullscreen === 'function' ||
    typeof proto.webkitRequestFullscreen === 'function';
  return enabled && hasRequest;
}

async function requestElementFullscreen(el: HTMLElement): Promise<boolean> {
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
  if (typeof anyEl.requestFullscreen === 'function') {
    await anyEl.requestFullscreen();
    return true;
  }
  if (typeof anyEl.webkitRequestFullscreen === 'function') {
    await Promise.resolve(anyEl.webkitRequestFullscreen());
    return true;
  }
  return false;
}

async function exitDocumentFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  if (doc.fullscreenElement && typeof doc.exitFullscreen === 'function') {
    await doc.exitFullscreen();
    return;
  }
  if (doc.webkitFullscreenElement && typeof doc.webkitExitFullscreen === 'function') {
    await Promise.resolve(doc.webkitExitFullscreen());
  }
}

function detectOrientationLockSupport(): boolean {
  if (typeof screen === 'undefined') return false;
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
  };
  return typeof orientation?.lock === 'function' && !detectIosSafari();
}

async function applyNativeOrientationLock(pref: OrientationPreference): Promise<void> {
  if (typeof screen === 'undefined') return;
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
  };
  if (!orientation) return;
  try {
    if (pref === 'auto') {
      orientation.unlock?.();
      return;
    }
    if (typeof orientation.lock === 'function') {
      await orientation.lock(pref === 'landscape' ? 'landscape' : 'portrait');
    }
  } catch {
    // Browsers frequently reject orientation.lock outside fullscreen or on iOS Safari.
  }
}

export function GlobalViewportProvider({
  rootRef,
  children,
}: {
  rootRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [metrics, setMetrics] = useState<ViewportMetrics>(() => readViewportMetrics());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => Boolean(getFullscreenElement()));
  const [isFocusExpanded, setIsFocusExpanded] = useState<boolean>(false);
  const [fullscreenOwner, setFullscreenOwner] = useState<FullscreenOwner>('none');
  const [orientationPreference, setOrientationPreferenceState] = useState<OrientationPreference>(() =>
    readStoredOrientationPreference(),
  );
  const [joystickMode, setJoystickModeState] = useState<JoystickMode>(() => readStoredJoystickMode());
  const [joystickOverride, setJoystickOverride] = useState<boolean | null>(() =>
    readStoredJoystickOverride(),
  );

  const activeMinigameIdsRef = useRef<Set<string>>(new Set());
  const fullscreenOwnerRef = useRef<FullscreenOwner>(fullscreenOwner);
  useEffect(() => {
    fullscreenOwnerRef.current = fullscreenOwner;
  }, [fullscreenOwner]);

  const canNativeFullscreen = useMemo(() => detectNativeFullscreenSupport(), []);
  const canLockOrientation = useMemo(() => detectOrientationLockSupport(), []);

  const writeCssVarsOnly = useCallback((next: ViewportMetrics) => {
    if (typeof document === 'undefined') return;
    const vvh = `${next.height}px`;
    const vvw = `${next.width}px`;
    document.documentElement.style.setProperty('--olw-vvh', vvh);
    document.documentElement.style.setProperty('--olw-vvw', vvw);
    if (rootRef.current) {
      rootRef.current.style.setProperty('--olw-vvh', vvh);
      rootRef.current.style.setProperty('--olw-vvw', vvw);
    }
  }, [rootRef]);

  const syncViewportCssVars = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const next = readViewportMetrics();
    setMetrics((prev) =>
      prev.width === next.width &&
      prev.height === next.height &&
      prev.isCoarsePointer === next.isCoarsePointer &&
      prev.hasTouch === next.hasTouch &&
      prev.isStandalonePwa === next.isStandalonePwa
        ? prev
        : next,
    );
    writeCssVarsOnly(next);
  }, [writeCssVarsOnly]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    writeCssVarsOnly(readViewportMetrics());

    const vv = window.visualViewport;
    const mqPointer = window.matchMedia?.('(pointer: coarse)');
    const mqDisplay = window.matchMedia?.('(display-mode: standalone)');

    const onOrientationChange = () => {
      syncViewportCssVars();
      window.setTimeout(syncViewportCssVars, 120);
      window.setTimeout(syncViewportCssVars, 320);
    };

    const onFsChange = () => {
      const fs = Boolean(getFullscreenElement());
      setIsFullscreen(fs);
      if (fs) {
        setIsFocusExpanded(true);
        if (orientationPreference !== 'auto') {
          void applyNativeOrientationLock(orientationPreference);
        }
      } else {
        setIsFocusExpanded(false);
        setFullscreenOwner('none');
        activeMinigameIdsRef.current.clear();
        void applyNativeOrientationLock('auto');
      }
      syncViewportCssVars();
    };

    vv?.addEventListener('resize', syncViewportCssVars);
    vv?.addEventListener('scroll', syncViewportCssVars);
    window.addEventListener('resize', syncViewportCssVars);
    window.addEventListener('orientationchange', onOrientationChange);
    mqPointer?.addEventListener?.('change', syncViewportCssVars);
    mqDisplay?.addEventListener?.('change', syncViewportCssVars);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    return () => {
      vv?.removeEventListener('resize', syncViewportCssVars);
      vv?.removeEventListener('scroll', syncViewportCssVars);
      window.removeEventListener('resize', syncViewportCssVars);
      window.removeEventListener('orientationchange', onOrientationChange);
      mqPointer?.removeEventListener?.('change', syncViewportCssVars);
      mqDisplay?.removeEventListener?.('change', syncViewportCssVars);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [orientationPreference, syncViewportCssVars, writeCssVarsOnly]);

  // Manage body scroll/overscroll behavior cleanly during focus/fullscreen mode
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const expanded = isFullscreen || isFocusExpanded;
    if (expanded) {
      document.body.dataset.olwFocusExpanded = '1';
      document.documentElement.dataset.olwFocusExpanded = '1';
      if (typeof window !== 'undefined' && metrics.isIosSafari && !metrics.isStandalonePwa) {
        window.scrollTo({ top: 1, behavior: 'auto' });
      }
    } else {
      delete document.body.dataset.olwFocusExpanded;
      delete document.documentElement.dataset.olwFocusExpanded;
    }
    return () => {
      delete document.body.dataset.olwFocusExpanded;
      delete document.documentElement.dataset.olwFocusExpanded;
    };
  }, [isFullscreen, isFocusExpanded, metrics.isIosSafari, metrics.isStandalonePwa]);

  const setOrientationPreference = useCallback(
    (pref: OrientationPreference) => {
      setOrientationPreferenceState(pref);
      try {
        window.localStorage.setItem(STORAGE_ORIENTATION_KEY, pref);
      } catch {
        // ignore storage errors
      }
      if (getFullscreenElement()) {
        void applyNativeOrientationLock(pref);
      } else if (pref === 'auto') {
        void applyNativeOrientationLock('auto');
      }
    },
    [],
  );

  const setJoystickMode = useCallback((mode: JoystickMode) => {
    setJoystickModeState(mode);
    try {
      window.localStorage.setItem(STORAGE_JOYSTICK_MODE_KEY, mode);
    } catch {
      // ignore storage errors
    }
  }, []);

  const setJoystickEnabled = useCallback((enabled: boolean) => {
    setJoystickOverride(enabled);
    try {
      window.localStorage.setItem(STORAGE_JOYSTICK_VISIBLE_KEY, enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, []);

  const layoutMode = useMemo(() => resolveHudLayoutMode(metrics), [metrics]);
  const joystickEnabled = joystickOverride ?? layoutMode !== 'desktop';

  const toggleJoystickEnabled = useCallback(() => {
    setJoystickEnabled(!joystickEnabled);
  }, [joystickEnabled, setJoystickEnabled]);

  const enterAppFullscreen = useCallback(() => {
    const target = rootRef.current ?? (typeof document !== 'undefined' ? document.documentElement : null);
    setFullscreenOwner((cur) => nextFullscreenOwnerOnEnter(cur, 'app'));
    setIsFocusExpanded(true);
    if (canNativeFullscreen && target) {
      void requestElementFullscreen(target)
        .then((ok) => {
          if (ok && orientationPreference !== 'auto') {
            void applyNativeOrientationLock(orientationPreference);
          }
        })
        .catch(() => {
          // Graceful Safari/webview fallback keeps isFocusExpanded = true
        });
    }
  }, [canNativeFullscreen, orientationPreference, rootRef]);

  const exitAppFullscreen = useCallback(() => {
    setIsFocusExpanded(false);
    setFullscreenOwner((cur) => nextFullscreenOwnerOnExit(cur, 'app'));
    activeMinigameIdsRef.current.clear();
    void applyNativeOrientationLock('auto');
    if (getFullscreenElement()) {
      void exitDocumentFullscreen().catch(() => undefined);
    }
  }, []);

  const toggleAppFullscreen = useCallback(() => {
    if (getFullscreenElement() || isFocusExpanded) {
      exitAppFullscreen();
    } else {
      enterAppFullscreen();
    }
  }, [enterAppFullscreen, exitAppFullscreen, isFocusExpanded]);

  const requestMinigameFocus = useCallback(
    (minigameId: string, targetEl?: HTMLElement | null) => {
      activeMinigameIdsRef.current.add(minigameId);
      setFullscreenOwner((cur) => nextFullscreenOwnerOnEnter(cur, 'minigame'));
      setIsFocusExpanded(true);
      if (getFullscreenElement()) return;
      const el = targetEl ?? rootRef.current ?? document.documentElement;
      if (canNativeFullscreen && el) {
        void requestElementFullscreen(el).catch(() => undefined);
      }
    },
    [canNativeFullscreen, rootRef],
  );

  const releaseMinigameFocus = useCallback((minigameId: string) => {
    activeMinigameIdsRef.current.delete(minigameId);
    if (activeMinigameIdsRef.current.size > 0) return;
    if (shouldExitFullscreenOnMinigameClose(fullscreenOwnerRef.current)) {
      setIsFocusExpanded(false);
      setFullscreenOwner('none');
      void applyNativeOrientationLock('auto');
      if (getFullscreenElement()) {
        void exitDocumentFullscreen().catch(() => undefined);
      }
    }
  }, []);

  const hotbarStrategy = useMemo(
    () => computeHotbarDisplayStrategy(layoutMode, metrics.width),
    [layoutMode, metrics.width],
  );

  const manualRotateHint = useMemo(
    () => shouldShowManualRotateHint(layoutMode, orientationPreference, canLockOrientation),
    [layoutMode, orientationPreference, canLockOrientation],
  );

  const value = useMemo<GlobalViewportContextValue>(
    () => ({
      layoutMode,
      metrics,
      hotbarStrategy,
      isFullscreen,
      isFocusExpanded,
      isFullscreenOrExpanded: isFullscreen || isFocusExpanded,
      fullscreenOwner,
      canNativeFullscreen,
      canLockOrientation,
      orientationPreference,
      manualRotateHint,
      joystickMode,
      joystickEnabled,
      setOrientationPreference,
      setJoystickMode,
      setJoystickEnabled,
      toggleJoystickEnabled,
      toggleAppFullscreen,
      enterAppFullscreen,
      exitAppFullscreen,
      requestMinigameFocus,
      releaseMinigameFocus,
    }),
    [
      layoutMode,
      metrics,
      hotbarStrategy,
      isFullscreen,
      isFocusExpanded,
      fullscreenOwner,
      canNativeFullscreen,
      canLockOrientation,
      orientationPreference,
      manualRotateHint,
      joystickMode,
      joystickEnabled,
      setOrientationPreference,
      setJoystickMode,
      setJoystickEnabled,
      toggleJoystickEnabled,
      toggleAppFullscreen,
      enterAppFullscreen,
      exitAppFullscreen,
      requestMinigameFocus,
      releaseMinigameFocus,
    ],
  );

  return (
    <GlobalViewportContext.Provider value={value}>
      {children}
    </GlobalViewportContext.Provider>
  );
}

export function useOptionalGlobalViewport(): GlobalViewportContextValue | null {
  return useContext(GlobalViewportContext);
}

export function useGlobalViewport(): GlobalViewportContextValue {
  const ctx = useContext(GlobalViewportContext);
  if (!ctx) {
    throw new Error('useGlobalViewport must be used inside GlobalViewportProvider');
  }
  return ctx;
}

/**
 * Shared Focus/Fullscreen hook compatible with Billiards V3.2's `useFocusMode` contract.
 * Reuses the single global fullscreen owner so closing Billiards (or any minigame)
 * never exits fullscreen when the main game requested it.
 */
export function useSharedFocusMode(
  containerRef?: RefObject<HTMLElement | null>,
  minigameId = 'minigame',
): FocusModeState {
  const ctx = useContext(GlobalViewportContext);

  useEffect(() => {
    if (!ctx) return;
    return () => {
      ctx.releaseMinigameFocus(minigameId);
    };
  }, [ctx, minigameId]);

  const toggleFocusOrFullscreen = useCallback(() => {
    if (!ctx) return;
    if (ctx.isFullscreenOrExpanded) {
      if (ctx.fullscreenOwner === 'app') {
        ctx.exitAppFullscreen();
      } else {
        ctx.releaseMinigameFocus(minigameId);
      }
      return;
    }
    ctx.requestMinigameFocus(minigameId, containerRef?.current ?? null);
  }, [containerRef, ctx, minigameId]);

  if (!ctx) {
    return {
      isFullscreen: false,
      isFocusExpanded: false,
      canNativeFullscreen: false,
      viewportHeightPx: typeof window !== 'undefined' ? window.innerHeight : null,
      toggleFocusOrFullscreen: () => undefined,
    };
  }

  return {
    isFullscreen: ctx.isFullscreen,
    isFocusExpanded: ctx.isFocusExpanded,
    canNativeFullscreen: ctx.canNativeFullscreen,
    viewportHeightPx: ctx.metrics.height,
    toggleFocusOrFullscreen,
  };
}
