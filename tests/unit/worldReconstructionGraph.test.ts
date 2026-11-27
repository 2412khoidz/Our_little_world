import { describe, expect, it } from 'vitest';
import { getMapDefinition, getMapTilePixelSize } from '../../src/shared/maps';
import { buildFarmSlicePlotInteractables } from '../../src/shared/farming/farmPlayableBridge';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import type { MapId } from '../../src/shared/types';
import beachJson from '../../src/assets/maps/beach.json';
import villageJson from '../../src/assets/maps/village.json';

function reachableTiles(mapId: MapId): Set<string> {
  const def = getMapDefinition(mapId);
  const q: Array<[number, number]> = [[def.defaultSpawn.tileX, def.defaultSpawn.tileY]];
  const seen = new Set<string>([`${def.defaultSpawn.tileX},${def.defaultSpawn.tileY}`]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (q.length > 0) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= def.widthTiles || ny >= def.heightTiles) continue;
      if (def.isStaticBlocked(nx, ny)) continue;
      const k = `${nx},${ny}`;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

describe('Mission N world reconstruction invariants', () => {
  const ZONES: MapId[] = [
    'home',
    'garden',
    'farm',
    'village',
    'forest',
    'beach',
    'shop_seed',
    'shop_tool',
    'shop_crop_market',
    'shop_town_hall',
  ];

  it('unifies all zones and shop interiors onto native 16×16 pixels', () => {
    for (const mapId of ZONES) {
      expect(getMapTilePixelSize(mapId), mapId).toBe(16);
    }
  });

  it('ensures beach is an independent coastal map (never identical crop to village)', () => {
    expect(beachJson.width).not.toBe(villageJson.width);
    const mapProp = beachJson.properties?.find((p) => p.name === 'olwDonorMap')?.value;
    expect(mapProp).toBe('gull_bay_independent_coast_v2');
  });

  it('ensures every spawn and portal destination is walkable and bounce-free', () => {
    for (const mapId of ZONES) {
      const def = getMapDefinition(mapId);
      expect(
        def.isStaticBlocked(def.defaultSpawn.tileX, def.defaultSpawn.tileY),
        `${mapId} defaultSpawn blocked`,
      ).toBe(false);

      for (const portal of def.portals) {
        const destDef = getMapDefinition(portal.targetMapId);
        expect(
          destDef.isStaticBlocked(portal.targetSpawnX, portal.targetSpawnY),
          `${mapId}.${portal.id} → ${portal.targetMapId}(${portal.targetSpawnX},${portal.targetSpawnY}) blocked`,
        ).toBe(false);

        for (const retPortal of destDef.portals) {
          const dist = Math.hypot(
            portal.targetSpawnX - retPortal.tileX,
            portal.targetSpawnY - retPortal.tileY,
          );
          expect(
            dist,
            `${mapId}.${portal.id} lands on ${portal.targetMapId}.${retPortal.id} bounce risk`,
          ).toBeGreaterThanOrEqual(1.5);
        }
      }
    }
  });

  it('ensures BFS reachability from defaultSpawn to portals, shops, and 184 farm plots', () => {
    for (const mapId of ['home', 'garden', 'farm', 'village', 'forest', 'beach'] as const) {
      const def = getMapDefinition(mapId);
      const seen = reachableTiles(mapId);
      for (const portal of def.portals) {
        expect(
          seen.has(`${portal.tileX},${portal.tileY}`),
          `${mapId} portal ${portal.id} at (${portal.tileX},${portal.tileY}) unreachable`,
        ).toBe(true);
      }
      const parsed = getParsedTiledWorld(mapId);
      for (const npc of parsed?.npcSpawns ?? []) {
        expect(seen.has(`${npc.tileX},${npc.tileY}`), `${mapId} NPC ${npc.id} unreachable`).toBe(true);
      }
    }

    const farmSeen = reachableTiles('farm');
    const farmInteractables = buildFarmSlicePlotInteractables();
    expect(farmInteractables).toHaveLength(184);
    for (const plot of farmInteractables) {
      const tx = Math.floor(plot.x / 16);
      const ty = Math.floor(plot.y / 16);
      expect(farmSeen.has(`${tx},${ty}`), `farm plot ${plot.id} at (${tx},${ty}) unreachable`).toBe(true);
    }
  });
});
