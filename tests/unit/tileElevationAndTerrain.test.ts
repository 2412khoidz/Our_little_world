import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getMapDefinition } from '../../src/shared/maps';
import {
  canStepTileElevation,
  getTileElevation,
  isElevationTransitionTile,
  parseTileElevationGrid,
  type TileElevationGrid,
} from '../../src/shared/world/tileElevation';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { getStaticZonePropBlockedTiles } from '../../src/shared/world/zonePropColliders';
import type { MapId } from '../../src/shared/types';

function loadMapJson(name: 'village' | 'farm' | 'beach' | 'forest') {
  const filePath = path.resolve(process.cwd(), 'src/assets/maps', `${name}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function reachableCountByElevationBfs(mapId: 'village' | 'farm' | 'beach' | 'forest') {
  const def = getMapDefinition(mapId);
  const parsed = getParsedTiledWorld(mapId)!;
  const grid = parsed.elevationGrid!;
  const startX = def.defaultSpawn.tileX;
  const startY = def.defaultSpawn.tileY;

  expect(getTileElevation(grid, startX, startY)).toBeGreaterThan(0);

  let totalElevated = 0;
  for (let y = 0; y < parsed.heightTiles; y += 1) {
    for (let x = 0; x < parsed.widthTiles; x += 1) {
      if (getTileElevation(grid, x, y) > 0 && !isTileBlockedFromParsed(parsed, x, y)) {
        totalElevated += 1;
      }
    }
  }

  const visited = new Set<string>([`${startX},${startY}`]);
  const queue: Array<[number, number]> = [[startX, startY]];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (isTileBlockedFromParsed(parsed, nx, ny)) continue;
      if (!canStepTileElevation(grid, cx, cy, nx, ny)) continue;
      visited.add(key);
      queue.push([nx, ny]);
    }
  }

  return { totalElevated, visited, def, parsed };
}

describe('Pokémon-style discrete tile elevation & terrain collision', () => {
  it('enforces level 0 blocking, same-level walking, +/-1 transition stairs, and blocks jumps & cliff corner cuts', () => {
    // 4x4 synthetic terrace:
    // row 0: [1, 1, 2, 0]
    // row 1: [1, 2(T), 2, 0]
    // row 2: [1, 1, 3, 0]
    const grid: TileElevationGrid = {
      widthTiles: 4,
      heightTiles: 3,
      levels: new Uint8Array([
        1, 1, 2, 0,
        1, 2, 2, 0,
        1, 1, 3, 0,
      ]),
      transitions: new Uint8Array([
        0, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 0, 0,
      ]),
    };

    expect(canStepTileElevation(grid, 0, 0, 1, 0)).toBe(true); // same level 1 -> 1
    expect(canStepTileElevation(grid, 2, 0, 3, 0)).toBe(false); // onto elevation 0 blocked
    expect(canStepTileElevation(grid, 1, 0, 2, 0)).toBe(false); // 1 -> 2 without transition blocked
    expect(canStepTileElevation(grid, 1, 0, 1, 1)).toBe(true); // 1 -> 2 onto transition allowed
    expect(canStepTileElevation(grid, 1, 1, 1, 2)).toBe(true); // 2(T) -> 1 allowed down stairs
    expect(canStepTileElevation(grid, 1, 2, 2, 2)).toBe(false); // 1 -> 3 jump > 1 always blocked
    // Diagonal cliff corner cut: (0,0)[1] -> (1,1)[2] touches non-transition (1,0)->(1,1) vs (0,1)[1]->(1,1)[2]
    expect(canStepTileElevation(grid, 2, 1, 1, 0)).toBe(false); // diagonal across non-transition corner (2,0) & (1,0)
  });

  it('parses forest.json cliff terraces, blocks non-stair cliff crossings, and allows stair traversal', () => {
    const forestJson = loadMapJson('forest');
    const grid = parseTileElevationGrid(forestJson)!;
    expect(grid).not.toBeNull();
    expect(getTileElevation(grid, 10, 16)).toBe(3);
    expect(getTileElevation(grid, 10, 17)).toBe(2);
    expect(isElevationTransitionTile(grid, 10, 17)).toBe(true);
    expect(getTileElevation(grid, 10, 18)).toBe(2);
    expect(getTileElevation(grid, 8, 17)).toBe(0);

    // Climbing stair tiles works cleanly; stepping onto sheer cliff face fails
    expect(canStepTileElevation(grid, 10, 18, 10, 17)).toBe(true);
    expect(canStepTileElevation(grid, 10, 17, 10, 16)).toBe(true);
    expect(canStepTileElevation(grid, 8, 18, 8, 17)).toBe(false);
    expect(canStepTileElevation(grid, 8, 16, 8, 17)).toBe(false);
  });

  it('blocks farm beehive (40,26), beach/village pier water tiles, and preserves 100% BFS reachability on all 4 tiled maps', () => {
    expect(getStaticZonePropBlockedTiles('farm').has('40,26')).toBe(true);

    const beachParsed = getParsedTiledWorld('beach')!;
    expect(getTileElevation(beachParsed.elevationGrid!, 29, 15)).toBeGreaterThanOrEqual(1);
    expect(getTileElevation(beachParsed.elevationGrid!, 29, 16)).toBeGreaterThanOrEqual(1);
    expect(getTileElevation(beachParsed.elevationGrid!, 29, 14)).toBe(0);
    expect(getTileElevation(beachParsed.elevationGrid!, 29, 17)).toBe(0);
    expect(canStepTileElevation(beachParsed.elevationGrid!, 29, 15, 29, 14)).toBe(false);
    expect(canStepTileElevation(beachParsed.elevationGrid!, 29, 16, 29, 17)).toBe(false);

    const villageParsed = getParsedTiledWorld('village')!;
    const villageBeachPortal = villageParsed.portals.find((p) => p.targetMapId === 'beach')!;
    expect(getTileElevation(villageParsed.elevationGrid!, villageBeachPortal.tileX, villageBeachPortal.tileY)).toBeGreaterThanOrEqual(1);
    expect(getTileElevation(villageParsed.elevationGrid!, 0, 0)).toBe(0);

    for (const mapId of ['village', 'farm', 'beach', 'forest'] as const satisfies readonly MapId[]) {
      const { totalElevated, visited, def, parsed } = reachableCountByElevationBfs(mapId);
      expect(visited.size, `${mapId} elevated BFS reachability`).toBe(totalElevated);

      for (const portal of def.portals) {
        let withinTrigger = false;
        const maxR = Math.max(1.5, portal.radiusTiles + 0.6);
        for (const coord of visited) {
          const [vx, vy] = coord.split(',').map(Number);
          if (Math.hypot(vx! - portal.tileX, vy! - portal.tileY) <= maxR) {
            withinTrigger = true;
            break;
          }
        }
        expect(
          withinTrigger,
          `${mapId} portal ${portal.id} (${portal.tileX},${portal.tileY}) reachable within radius ${portal.radiusTiles}`,
        ).toBe(true);
      }
      for (const npc of parsed.npcSpawns) {
        let nearNpc = visited.has(`${npc.tileX},${npc.tileY}`);
        if (!nearNpc) {
          for (const coord of visited) {
            const [vx, vy] = coord.split(',').map(Number);
            if (Math.hypot(vx! - npc.tileX, vy! - npc.tileY) <= 2) {
              nearNpc = true;
              break;
            }
          }
        }
        expect(
          nearNpc,
          `${mapId} npc ${npc.id} (${npc.tileX},${npc.tileY}) reachable`,
        ).toBe(true);
      }
    }
  });
});
