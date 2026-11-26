import { describe, expect, it } from 'vitest';
import { getMapDefinition } from '../../src/shared/maps';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';
import forestJson from '../../src/assets/maps/forest.json';

describe('Tuxemon forest transplant', () => {
  it('forest.json is stamped tuxemon donor', () => {
    const forest = getParsedTiledWorld('forest');
    expect(forest).not.toBeNull();
    const donor = (forestJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwDonor',
    );
    expect(donor?.value).toBe('tuxemon');
    const mapSlug = (forestJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwDonorMap',
    );
    expect(mapSlug?.value).toBe('tt_forest_route1');
  });

  it('spawn and south portal tiles are walkable with baked collision elsewhere', () => {
    const parsed = getParsedTiledWorld('forest')!;
    const spawn = getMapDefinition('forest').defaultSpawn;
    expect(isTileBlockedFromParsed(parsed, spawn.tileX, spawn.tileY)).toBe(false);
    expect(isTileBlockedFromParsed(parsed, 8, 39)).toBe(false);
    expect(isTileBlockedFromParsed(parsed, 8, 36)).toBe(false);
    expect(isTileBlockedFromParsed(parsed, 0, 0)).toBe(true);
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