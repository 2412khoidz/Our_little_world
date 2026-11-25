import { describe, expect, it } from 'vitest';
import { getMapDefinition } from '../../src/shared/maps';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';
import forestJson from '../../public/assets/maps/forest.json';

describe('PyDew forest slice', () => {
  it('forest.json is stamped pydew donor', () => {
    const forest = getParsedTiledWorld('forest');
    expect(forest).not.toBeNull();
    const pydewSign = forest!.interactableSpawns.find((s) => s.id === 'pydew_forest_sign');
    expect(pydewSign?.labelVi).toContain('Glade');
    const sketch = (forestJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwDonorSketch',
    );
    expect(sketch?.value).toBe('glade-v1-playable');
  });

  it('spawn and west portal tiles are walkable with tree collision elsewhere', () => {
    const parsed = getParsedTiledWorld('forest')!;
    const spawn = getMapDefinition('forest').defaultSpawn;
    expect(isTileBlockedFromParsed(parsed, spawn.tileX, spawn.tileY)).toBe(false);
    expect(isTileBlockedFromParsed(parsed, 1, 22)).toBe(false);
    expect(isTileBlockedFromParsed(parsed, 12, 11)).toBe(true);
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