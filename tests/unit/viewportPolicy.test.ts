import { describe, expect, it } from 'vitest';
import {
  computeHotbarDisplayStrategy,
  nextFullscreenOwnerOnEnter,
  nextFullscreenOwnerOnExit,
  resolveHudLayoutMode,
  shouldExitFullscreenOnMinigameClose,
  shouldShowManualRotateHint,
} from '../../src/shared/viewport/viewportPolicy';

describe('viewportPolicy — HUD mode, hotbar strategy, orientation & fullscreen ownership', () => {
  it('resolves desktop vs mobile-portrait vs mobile-landscape using pointer capability and dimensions', () => {
    expect(
      resolveHudLayoutMode({
        width: 1280,
        height: 720,
        isCoarsePointer: false,
        hasTouch: false,
      }),
    ).toBe('desktop');

    // Representative mobile portrait sizes
    for (const [width, height] of [
      [360, 800],
      [390, 844],
      [430, 932],
    ] as const) {
      expect(
        resolveHudLayoutMode({
          width,
          height,
          isCoarsePointer: true,
          hasTouch: true,
        }),
      ).toBe('mobile-portrait');
    }

    // Corresponding mobile landscape sizes (must NOT collapse to desktop even at 844/932px width)
    for (const [width, height] of [
      [800, 360],
      [844, 390],
      [932, 430],
    ] as const) {
      expect(
        resolveHudLayoutMode({
          width,
          height,
          isCoarsePointer: true,
          hasTouch: true,
        }),
      ).toBe('mobile-landscape');
    }
  });

  it('chooses 4-slot paged hotbar on portrait and 8-slot row on standard mobile landscape', () => {
    expect(computeHotbarDisplayStrategy('desktop', 1280)).toEqual({ mode: 'full', slotsPerPage: 8 });
    expect(computeHotbarDisplayStrategy('mobile-portrait', 360)).toEqual({ mode: 'paged', slotsPerPage: 4 });
    expect(computeHotbarDisplayStrategy('mobile-portrait', 430)).toEqual({ mode: 'paged', slotsPerPage: 4 });
    expect(computeHotbarDisplayStrategy('mobile-landscape', 800)).toEqual({ mode: 'full', slotsPerPage: 8 });
    expect(computeHotbarDisplayStrategy('mobile-landscape', 844)).toEqual({ mode: 'full', slotsPerPage: 8 });
    expect(computeHotbarDisplayStrategy('mobile-landscape', 580)).toEqual({ mode: 'paged', slotsPerPage: 4 });
  });

  it('shows manual rotation hint only when native lock is unsupported and layout mismatches preference', () => {
    expect(shouldShowManualRotateHint('mobile-portrait', 'auto', false)).toBeNull();
    expect(shouldShowManualRotateHint('mobile-portrait', 'landscape', true)).toBeNull();
    expect(shouldShowManualRotateHint('mobile-portrait', 'landscape', false)).toBe('rotate-to-landscape');
    expect(shouldShowManualRotateHint('mobile-landscape', 'portrait', false)).toBe('rotate-to-portrait');
    expect(shouldShowManualRotateHint('mobile-landscape', 'landscape', false)).toBeNull();
    expect(shouldShowManualRotateHint('desktop', 'landscape', false)).toBeNull();
  });

  it('preserves app-owned fullscreen when a minigame opens and closes', () => {
    let owner = nextFullscreenOwnerOnEnter('none', 'app');
    expect(owner).toBe('app');

    // Opening billiards/minigame must NOT downgrade or steal app ownership
    owner = nextFullscreenOwnerOnEnter(owner, 'minigame');
    expect(owner).toBe('app');
    expect(shouldExitFullscreenOnMinigameClose(owner)).toBe(false);

    // Minigame requesting focus on its own DOES release fullscreen on close
    let miniOwner = nextFullscreenOwnerOnEnter('none', 'minigame');
    expect(miniOwner).toBe('minigame');
    expect(shouldExitFullscreenOnMinigameClose(miniOwner)).toBe(true);
    miniOwner = nextFullscreenOwnerOnExit(miniOwner, 'minigame');
    expect(miniOwner).toBe('none');
  });
});
