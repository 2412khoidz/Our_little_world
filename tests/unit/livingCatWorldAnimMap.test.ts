import { describe, expect, it } from 'vitest';
import { mapWorldPetStateToOlwCatAnim } from '../../src/shared/petLiving/petMovement/livingCatWorldAnimMap';

describe('livingCatWorldAnimMap', () => {
  it('maps directional locomotion to Frakassets cat-orange tags', () => {
    expect(mapWorldPetStateToOlwCatAnim('walk_east')).toBe('olw-cat-Walk_East');
    expect(mapWorldPetStateToOlwCatAnim('run_north')).toBe('olw-cat-Walk_North');
    expect(mapWorldPetStateToOlwCatAnim('idle_west')).toBe('olw-cat-Idle_West');
    expect(mapWorldPetStateToOlwCatAnim('sleep')).toBe('olw-cat-Sleep_South');
    expect(mapWorldPetStateToOlwCatAnim('pet_purr')).toBe('olw-cat-Happy_South');
  });
});