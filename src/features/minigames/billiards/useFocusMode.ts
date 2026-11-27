import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface FocusModeState {
  isFullscreen: boolean;
  isFocusExpanded: boolean;
  canNativeFullscreen: boolean;
  viewportHeightPx: number | null;
  toggleFocusOrFullscreen: () => void;
}

/**
 * Manages mobile Focus Mode (visualViewport height tracking, body scroll lock,
 * Android Fullscreen API toggle where supported, and guaranteed cleanup on exit).
 */
export function useFocusMode(containerRef: RefObject<HTMLElement | null>): FocusModeState {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusExpanded, setIsFocusExpanded] = useState(false);
  const [viewportHeightPx, setViewportHeightPx] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.visualViewport?.height ?? window.innerHeight;
  });

  const canNativeFullscreen =
    typeof document !== 'undefined' &&
    Boolean(document.fullscreenEnabled) &&
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.requestFullscreen === 'function';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncViewport = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeightPx(Math.round(vh));
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
      setIsFullscreen(fs);
      if (fs) setIsFocusExpanded(true);
    };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      vv?.removeEventListener('resize', syncViewport);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      document.removeEventListener('fullscreenchange', onFsChange);
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [containerRef]);

  const toggleFocusOrFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      setIsFocusExpanded(false);
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (canNativeFullscreen && el && typeof el.requestFullscreen === 'function') {
      setIsFocusExpanded(true);
      void el.requestFullscreen().catch(() => {
        // iOS Safari / embedded contexts ignore requestFullscreen -> keep expanded focus CSS state
      });
      return;
    }
    setIsFocusExpanded((v) => !v);
  }, [canNativeFullscreen, containerRef]);

  return {
    isFullscreen,
    isFocusExpanded,
    canNativeFullscreen,
    viewportHeightPx,
    toggleFocusOrFullscreen,
  };
}
