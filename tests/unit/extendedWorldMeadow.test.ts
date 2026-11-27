import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMapDefinition, isOutdoorMapUnlocked } from '../../src/shared/maps';
import { OUTDOOR_MAIN_GAME_LANDMARKS } from '../../src/shared/worldContent/outdoorGameplayAnchors';
import { isExtendedWorldDevEnabled } from '../../src/shared/worldIntegration/extendedWorldDevFlag';

describe('extended world — outdoor main game', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('defaults canonical extended world ON in production and vitest', () => {
    expect(isExtendedWorldDevEnabled()).toBe(true);
    expect(isOutdoorMapUnlocked()).toBe(true);
  });

  it('outdoor map definition exists with landmarks', () => {
    const def = getMapDefinition('outdoor');
    expect(def.widthTiles).toBe(64);
    expect(OUTDOOR_MAIN_GAME_LANDMARKS.length).toBe(10);
    expect(def.portals[0]?.targetMapId).toBe('garden');
  });

  it('allows explicit DEV opt-out via URL query ?extended-world=0', () => {
    vi.stubEnv('DEV', true);
    vi.stubGlobal('window', { location: { search: '?extended-world=0' } });
    expect(isExtendedWorldDevEnabled()).toBe(false);
    expect(isOutdoorMapUnlocked()).toBe(false);
  });
});