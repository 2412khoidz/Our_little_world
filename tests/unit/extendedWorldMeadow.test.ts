import { describe, expect, it } from 'vitest';
import { getMapDefinition } from '../../src/shared/maps';
import { MEADOW_MAIN_GAME_LANDMARKS } from '../../src/shared/worldContent/meadowGameplayAnchors';
import { isExtendedWorldDevEnabled } from '../../src/shared/worldIntegration/extendedWorldDevFlag';

describe('extended world — meadow preview', () => {
  it('dev flag is off in vitest', () => {
    expect(isExtendedWorldDevEnabled()).toBe(false);
  });

  it('meadow map definition exists with landmarks', () => {
    const def = getMapDefinition('meadow');
    expect(def.widthTiles).toBeGreaterThan(20);
    expect(MEADOW_MAIN_GAME_LANDMARKS.length).toBeGreaterThanOrEqual(5);
    expect(def.portals[0]?.targetMapId).toBe('garden');
  });
});