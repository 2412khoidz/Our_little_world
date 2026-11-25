import { describe, expect, it } from 'vitest';
import {
  PYDEW_FARMER_ACTION_ROWS,
  PYDEW_FARMER_GAMEPLAY_MANIFEST,
  PYDEW_FARMER_SHEET,
} from '../../src/shared/donor/pydewFarmerCharacterSheet';
import { cozyGameplayAnimKey } from '../../src/game/art/donorPydewFarmerAvatarTexture';

describe('PyDew farmer donor-framed actions', () => {
  it('maps tools to dedicated rows (not idle aliases)', () => {
    expect(PYDEW_FARMER_ACTION_ROWS.hoe).toBe(PYDEW_FARMER_SHEET.rows.hoe);
    expect(PYDEW_FARMER_ACTION_ROWS.water).toBe(PYDEW_FARMER_SHEET.rows.water);
    expect(PYDEW_FARMER_ACTION_ROWS.harvest).toBe(PYDEW_FARMER_SHEET.rows.harvest);
    expect(PYDEW_FARMER_GAMEPLAY_MANIFEST.facing8Policy).toBe('cardinal-from-facing8');
  });

  it('builds stable anim keys for farming clips', () => {
    expect(cozyGameplayAnimKey('donor-pydew-farmer-may', 'hoe', 'down')).toBe(
      'donor-pydew-farmer-may:tool-down',
    );
    expect(cozyGameplayAnimKey('donor-pydew-farmer-may', 'water', 'left')).toBe(
      'donor-pydew-farmer-may:water-left',
    );
  });
});