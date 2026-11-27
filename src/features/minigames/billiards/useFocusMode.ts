import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useOptionalGlobalViewport } from '../../../app/viewport/GlobalViewportContext';

export interface FocusModeState {
  isFullscreen: boolean;
  isFocusExpanded: boolean;
  canNativeFullscreen: boolean;
  viewportHeightPx: number | null;
  toggleFocusOrFullscreen: () => void;
}

/**
 * Manages mobile Focus Mode and fullscreen ownership for Billiards 2D & 3D:
 * - Inside GlobalViewportProvider (main app): delegates to the single global fullscreen
 *   controller (`fullscreenOwner`) so closing Billiards preserves app-level fullscreen.
 * - Outside GlobalViewportProvider (standalone unit tests): uses safe local fallback state.
 */
export function useFocusMode(
  containerRef: RefObject<HTMLElement | null>,
  minigameId = 'billiards',
): FocusModeState {
  const globalViewport = useOptionalGlobalViewport();
  const [localIsFullscreen, setLocalIsFullscreen] = useState(false);
  const [localIsFocusExpanded, setLocalIsFocusExpanded] = useState(false);
  const [localViewportHeightPx, setLocalViewportHeightPx] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.visualViewport?.height ?? window.innerHeight;
  });
  const localOwnedFullscreenRef = useRef(false);

  const localCanNativeFullscreen =
    typeof document !== 'undefined' &&
    Boolean(document.fullscreenEnabled) &&
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.requestFullscreen === 'function';

  useEffect(() => {
    if (!globalViewport) return;
    const { releaseMinigameFocus } = globalViewport;
    return () => {
      releaseMinigameFocus(minigameId);
    };
  }, [globalViewport, minigameId]);

  useEffect(() => {
    if (!globalViewport || !containerRef.current) return;
    containerRef.current.style.setProperty('--olw-vvh', `${globalViewport.metrics.height}px`);
  }, [containerRef, globalViewport]);

  useEffect(() => {
    if (globalViewport || typeof window === 'undefined') return;
    const syncViewport = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setLocalViewportHeightPx(Math.round(vh));
      if (containerRef.current) {
        containerRef.current.style.setProperty('--olw-vvh', `${Math.round(vh)}px`);
      }
    };
    syncViewport();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewport);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);

    const onFsChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setLocalIsFullscreen(fs);
      if (fs) {
        setLocalIsFocusExpanded(true);
      } else {
        localOwnedFullscreenRef.current = false;
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      vv?.removeEventListener('resize', syncViewport);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      document.removeEventListener('fullscreenchange', onFsChange);
      if (
        localOwnedFullscreenRef.current &&
        typeof document !== 'undefined' &&
        document.fullscreenElement
      ) {
        localOwnedFullscreenRef.current = false;
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [containerRef, globalViewport]);

  const toggleFocusOrFullscreen = useCallback(() => {
    if (globalViewport) {
      if (globalViewport.isFullscreenOrExpanded) {
        if (globalViewport.fullscreenOwner === 'app') {
          globalViewport.exitAppFullscreen();
        } else {
          globalViewport.releaseMinigameFocus(minigameId);
        }
        return;
      }
      globalViewport.requestMinigameFocus(minigameId, containerRef.current);
      return;
    }

    const el = containerRef.current;
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      localOwnedFullscreenRef.current = false;
      setLocalIsFocusExpanded(false);
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (localCanNativeFullscreen && el && typeof el.requestFullscreen === 'function') {
      localOwnedFullscreenRef.current = true;
      setLocalIsFocusExpanded(true);
      void el.requestFullscreen().catch(() => {
        localOwnedFullscreenRef.current = false;
        // iOS Safari / embedded contexts ignore requestFullscreen -> keep expanded focus CSS state
      });
      return;
    }
    setLocalIsFocusExpanded((v) => !v);
  }, [containerRef, globalViewport, localCanNativeFullscreen, minigameId]);

  if (globalViewport) {
    return {
      isFullscreen: globalViewport.isFullscreen,
      isFocusExpanded: globalViewport.isFocusExpanded,
      canNativeFullscreen: globalViewport.canNativeFullscreen,
      viewportHeightPx: globalViewport.metrics.height,
      toggleFocusOrFullscreen,
    };
  }

  return {
    isFullscreen: localIsFullscreen,
    isFocusExpanded: localIsFocusExpanded,
    canNativeFullscreen: localCanNativeFullscreen,
    viewportHeightPx: localViewportHeightPx,
    toggleFocusOrFullscreen,
  };
}
