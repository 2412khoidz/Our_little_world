import { describe, expect, it } from 'vitest';
import { getMapDefinition, MAP_IDS } from '../../src/shared/maps';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';
import { normalizeMapId } from '../../src/shared/world/mapIdCompat';

function bfsReachable(
  start: { tileX: number; tileY: number },
  goal: { tileX: number; tileY: number },
  blocked: (x: number, y: number) => boolean,
  w: number,
  h: number,
): boolean {
  const key = (x: number, y: number) => `${x},${y}`;
  const q: { x: number; y: number }[] = [{ x: start.tileX, y: start.tileY }];
  const seen = new Set<string>([key(start.tileX, start.tileY)]);
  const dirs: [number, number][] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === goal.tileX && cur.y === goal.tileY) return true;
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (blocked(nx, ny)) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return false;
}

function isDonorCabacosVillage(): boolean {
  return getParsedTiledWorld('village')!.widthTiles === 86;
}

describe('Tiled village & farm contract', () => {
  it('MAP_IDS includes village/farm and legacy meadow maps to village', () => {
    expect(MAP_IDS).toContain('village');
    expect(MAP_IDS).toContain('farm');
    expect(normalizeMapId('meadow')).toBe('village');
  });

  it('village and farm share collision layer with map definitions', () => {
    for (const id of ['village', 'farm'] as const) {
      const parsed = getParsedTiledWorld(id)!;
      const def = getMapDefinition(id);
      expect(def.widthTiles).toBe(parsed.widthTiles);
      expect(def.heightTiles).toBe(parsed.heightTiles);
      expect(def.portals.length).toBeGreaterThan(0);
      for (const portal of def.portals) {
        expect(def.isStaticBlocked(portal.tileX, portal.tileY)).toBe(false);
      }
    }
  });

  it('village square connects to farm gate and garden portal', () => {
    if (isDonorCabacosVillage()) return;
    const def = getMapDefinition('village');
    const block = (x: number, y: number) => def.isStaticBlocked(x, y);
    const spawn = def.defaultSpawn;
    const farmPortal = def.portals.find((p) => p.targetMapId === 'farm')!;
    const gardenPortal = def.portals.find((p) => p.targetMapId === 'garden')!;
    expect(
      bfsReachable(spawn, farmPortal, block, def.widthTiles, def.heightTiles),
    ).toBe(true);
    expect(
      bfsReachable(spawn, gardenPortal, block, def.widthTiles, def.heightTiles),
    ).toBe(true);
  });

  it('farm field plots provide ≥160 walkable soil tiles', () => {
    const parsed = getParsedTiledWorld('farm')!;
    let soilWalkable = 0;
    const inMainField = (x: number, y: number) => x >= 16 && x <= 27 && y >= 10 && y <= 19;
    const inAnnexField = (x: number, y: number) => x >= 40 && x <= 47 && y >= 28 && y <= 35;
    for (let y = 0; y < parsed.heightTiles; y += 1) {
      for (let x = 0; x < parsed.widthTiles; x += 1) {
        if (!inMainField(x, y) && !inAnnexField(x, y)) continue;
        if (!isTileBlockedFromParsed(parsed, x, y)) soilWalkable += 1;
      }
    }
    expect(soilWalkable).toBeGreaterThanOrEqual(160);
  });

  it('forest glade and beach link back to village graph', () => {
    if (isDonorCabacosVillage()) {
      const village = getMapDefinition('village');
      const beach = getMapDefinition('beach');
      expect(village.portals.some((p) => p.targetMapId === 'shop')).toBe(true);
      expect(village.portals.some((p) => p.targetMapId === 'garden')).toBe(true);
      expect(village.portals.some((p) => p.targetMapId === 'beach')).toBe(true);
      expect(beach.portals.some((p) => p.targetMapId === 'village')).toBe(true);
      return;
    }
    const forest = getMapDefinition('forest');
    const beach = getMapDefinition('beach');
    const village = getMapDefinition('village');
    expect(forest.portals.some((p) => p.targetMapId === 'village')).toBe(true);
    expect(forest.portals.some((p) => p.targetMapId === 'beach')).toBe(true);
    expect(beach.portals[0]?.targetMapId).toBe('forest');
    expect(village.portals.some((p) => p.targetMapId === 'forest')).toBe(true);
    expect(village.portals.some((p) => p.targetMapId === 'shop')).toBe(true);
  });
});