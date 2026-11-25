import { describe, expect, it } from 'vitest';
import { getMapDefinition } from '../../src/shared/maps';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';

describe('PyDew forest slice', () => {
  it('forest.json is stamped pydew donor', () => {
    const forest = getParsedTiledWorld('forest');
    expect(forest).not.toBeNull();
    const pydewSign = forest!.interactableSpawns.find((s) => s.id === 'pydew_forest_sign');
    expect(pydewSign?.labelVi).toContain('PyDew');
  });

  it('village↔forest portal graph for Cabacos extended world', () => {
    const village = getParsedTiledWorld('village')!;
    const forest = getParsedTiledWorld('forest')!;
    const toForest = village.portals.find((p) => p.id === 'village-to-forest');
    expect(toForest?.targetMapId).toBe('forest');
    const toVillage = forest.portals.find((p) => p.id === 'forest-to-village');
    expect(toVillage?.targetMapId).toBe('village');
    expect(getMapDefinition('forest').portals.length).toBeGreaterThan(0);
  });
});