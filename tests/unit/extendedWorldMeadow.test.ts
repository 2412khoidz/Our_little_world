import { describe, expect, it } from 'vitest';
import { getMapDefinition, isOutdoorMapUnlocked } from '../../src/shared/maps';
import { OUTDOOR_MAIN_GAME_LANDMARKS } from '../../src/shared/worldContent/outdoorGameplayAnchors';
import { isExtendedWorldDevEnabled } from '../../src/shared/worldIntegration/extendedWorldDevFlag';

describe('extended world — outdoor main game', () => {
  it('dev flag is off in vitest', () => {
    expect(isExtendedWorldDevEnabled()).toBe(false);
  });

  it('outdoor map definition exists with landmarks', () => {
    const def = getMapDefinition('outdoor');
    expect(def.widthTiles).toBe(64);
    expect(OUTDOOR_MAIN_GAME_LANDMARKS.length).toBe(10);
    expect(def.portals[0]?.targetMapId).toBe('garden');
  });

  it('isOutdoorMapUnlocked follows dev flag', () => {
    expect(isOutdoorMapUnlocked()).toBe(false);
  });
});