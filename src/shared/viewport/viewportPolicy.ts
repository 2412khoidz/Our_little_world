/**
 * Pure TypeScript viewport, HUD layout mode, orientation, and fullscreen ownership policy.
 * Zero DOM, React, or Phaser dependencies.
 */

export type HudLayoutMode = 'desktop' | 'mobile-portrait' | 'mobile-landscape';
export type OrientationPreference = 'auto' | 'portrait' | 'landscape';
export type JoystickMode = 'fixed' | 'floating';
export type FullscreenOwner = 'none' | 'app' | 'minigame';

export interface ViewportMetrics {
  readonly width: number;
  readonly height: number;
  readonly isCoarsePointer: boolean;
  readonly hasTouch: boolean;
  readonly isStandalonePwa?: boolean;
  readonly isIosSafari?: boolean;
}

export interface HotbarDisplayStrategy {
  readonly mode: 'full' | 'paged';
  readonly slotsPerPage: 4 | 8;
}

export type ManualRotateHint = 'rotate-to-landscape' | 'rotate-to-portrait' | null;

function sanitizePositive(n: number, fallback: number): number {
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Resolves HUD layout mode from pointer capability AND viewport geometry.
 * Does NOT rely solely on screen width, so 844x390 and 932x430 touch devices
 * cleanly enter `mobile-landscape` instead of falling back to desktop UI.
 */
export function resolveHudLayoutMode(metrics: ViewportMetrics): HudLayoutMode {
  const width = sanitizePositive(metrics.width, 1280);
  const height = sanitizePositive(metrics.height, 720);
  const shortSide = Math.min(width, height);

  const isTouchCapable = Boolean(metrics.isCoarsePointer || metrics.hasTouch);
  const isTouchMobile = isTouchCapable && (shortSide <= 600 || width <= 960);
  const isNarrowOrShortFallback = width <= 768 || (height <= 460 && width <= 960);

  if (!isTouchMobile && !isNarrowOrShortFallback) {
    return 'desktop';
  }

  return width > height ? 'mobile-landscape' : 'mobile-portrait';
}

/**
 * Determines whether mobile portrait uses 4+4 paging (preserving >= 48px touch targets
 * on 360px/390px/430px screens) and whether landscape fits all 8 slots in one row.
 */
export function computeHotbarDisplayStrategy(
  layoutMode: HudLayoutMode,
  usableWidthPx: number,
): HotbarDisplayStrategy {
  if (layoutMode === 'desktop') {
    return { mode: 'full', slotsPerPage: 8 };
  }
  const safeWidth = sanitizePositive(usableWidthPx, layoutMode === 'mobile-landscape' ? 844 : 390);
  if (layoutMode === 'mobile-landscape' && safeWidth >= 660) {
    return { mode: 'full', slotsPerPage: 8 };
  }
  return { mode: 'paged', slotsPerPage: 4 };
}

/**
 * Returns a non-blocking manual rotation hint when the player explicitly chose
 * portrait or landscape on a browser without native orientation lock (e.g. iPhone Safari).
 */
export function shouldShowManualRotateHint(
  layoutMode: HudLayoutMode,
  preference: OrientationPreference,
  canLockOrientation: boolean,
): ManualRotateHint {
  if (layoutMode === 'desktop' || preference === 'auto' || canLockOrientation) {
    return null;
  }
  if (preference === 'landscape' && layoutMode === 'mobile-portrait') {
    return 'rotate-to-landscape';
  }
  if (preference === 'portrait' && layoutMode === 'mobile-landscape') {
    return 'rotate-to-portrait';
  }
  return null;
}

/**
 * Single-owner fullscreen state transitions:
 * - App fullscreen owns the lifecycle across maps, inventory, pet care, and minigames.
 * - Closing a minigame NEVER exits fullscreen if `'app'` requested it.
 */
export function nextFullscreenOwnerOnEnter(
  currentOwner: FullscreenOwner,
  requester: Exclude<FullscreenOwner, 'none'>,
): FullscreenOwner {
  if (currentOwner === 'app') return 'app';
  return requester;
}

export function shouldExitFullscreenOnMinigameClose(currentOwner: FullscreenOwner): boolean {
  return currentOwner === 'minigame';
}

export function nextFullscreenOwnerOnExit(
  currentOwner: FullscreenOwner,
  exiter: Exclude<FullscreenOwner, 'none'>,
): FullscreenOwner {
  if (exiter === 'app') return 'none';
  return currentOwner === 'minigame' ? 'none' : currentOwner;
}
