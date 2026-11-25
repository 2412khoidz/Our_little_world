import { describe, expect, it } from 'vitest';
import { getMapDefinition } from '../../src/shared/maps';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';
import homeJson from '../../public/assets/maps/home.json';
import gardenJson from '../../public/assets/maps/garden.json';

describe('Sprout Lands home/garden transplant', () => {
  it('marks donor maps with sprout-lands metadata', () => {
    const homeProps = (homeJson as { properties?: { name: string; value: string }[] }).properties ?? [];
    const gardenProps = (gardenJson as { properties?: { name: string; value: string }[] }).properties ?? [];
    expect(homeProps.find((p) => p.name === 'olwDonor')?.value).toBe('sprout-lands');
    expect(gardenProps.find((p) => p.name === 'olwDonor')?.value).toBe('sprout-lands');
    expect(homeProps.find((p) => p.name === 'olwPrivateArtPrefer')?.value).toBe('demo-e');
  });

  it('uses native Sprout tilesets (not tileset-cozy)', () => {
    const names = (gardenJson as { tilesets?: { name: string }[] }).tilesets?.map((t) => t.name) ?? [];
    expect(names.some((n) => n.startsWith('sprout_'))).toBe(true);
    expect(names).not.toContain('tileset-cozy');
  });

  it('connects home door to garden spawn', () => {
    const home = getParsedTiledWorld('home')!;
    const garden = getParsedTiledWorld('garden')!;
    const door = home.portals.find((p) => p.id === 'door-to-garden')!;
    expect(door.targetMapId).toBe('garden');
    expect(door.labelVi).toContain('vườn');
    const cottage = garden.portals.find((p) => p.id === 'cottage-to-home')!;
    expect(cottage.targetMapId).toBe('home');

    const homeDef = getMapDefinition('home');
    const block = (x: number, y: number) => isTileBlockedFromParsed(home, x, y);
    const spawn = homeDef.defaultSpawn;
    let walkable = false;
    const q = [{ x: spawn.tileX, y: spawn.tileY }];
    const seen = new Set([`${spawn.tileX},${spawn.tileY}`]);
    while (q.length) {
      const cur = q.shift()!;
      if (cur.x === door.tileX && cur.y === door.tileY) {
        walkable = true;
        break;
      }
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= home.widthTiles || ny >= home.heightTiles) continue;
        if (block(nx, ny)) continue;
        const k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
    expect(walkable).toBe(true);
  });
});