import { describe, expect, it } from 'vitest';
import { COZY_PUNY_ACTION_ROWS, PUNY_DONOR_GAMEPLAY_MANIFEST, PUNY_SHEET } from '../../src/shared/donor/punyCharacter8dSheet';
import { cozyPunyAnimKey } from '../../src/game/art/donorPunyAvatarTexture';

describe('cozy Puny donor-framed actions', () => {
  it('maps sit/lie/tools to real sheet rows (not idle/slash aliases)', () => {
    expect(COZY_PUNY_ACTION_ROWS.sit).toBe(PUNY_SHEET.rows.hurt);
    expect(COZY_PUNY_ACTION_ROWS.lie).toBe(PUNY_SHEET.rows.death);
    expect(COZY_PUNY_ACTION_ROWS.hoe).toBe(PUNY_SHEET.rows.stave);
    expect(COZY_PUNY_ACTION_ROWS.water).toBe(PUNY_SHEET.rows.bow);
    expect(PUNY_DONOR_GAMEPLAY_MANIFEST.gameplayExcludedRows).toContain('slash');
  });

  it('builds stable anim keys for farming clips', () => {
    expect(cozyPunyAnimKey('donor-puny-character-base', 'hoe', 'down')).toBe(
      'donor-puny-character-base:tool-down',
    );
    expect(cozyPunyAnimKey('donor-puny-character-base', 'water', 'left')).toBe(
      'donor-puny-character-base:water-left',
    );
  });
});