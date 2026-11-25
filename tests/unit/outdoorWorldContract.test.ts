import { describe, expect, it } from 'vitest';
import { getMapDefinition, MAP_IDS } from '../../src/shared/maps';
import { isOutdoorBlocked } from '../../src/shared/world/outdoorCollision';
import { OUTDOOR_LANDMARKS, OUTDOOR_DEFAULT_SPAWN, zoneAtTile } from '../../src/shared/world/outdoorZones';
import { normalizeMapId } from '../../src/shared/world/mapIdCompat';

function bfsReachable(
  start: { tileX: number; tileY: number },
  goal: { tileX: number; tileY: number },
  blocked: (x: number, y: number) => boolean,
  size: number,
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
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (blocked(nx, ny)) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return false;
}

describe('outdoor unified world contract', () => {
  it('MAP_IDS includes outdoor and legacy meadow normalizes', () => {
    expect(MAP_IDS).toContain('outdoor');
    expect(normalizeMapId('meadow')).toBe('village');
    expect(normalizeMapId('outdoor')).toBe('outdoor');
  });

  it('outdoor map is 64×64 with garden portal', () => {
    const def = getMapDefinition('outdoor');
    expect(def.widthTiles).toBe(64);
    expect(def.heightTiles).toBe(64);
    expect(def.portals[0]?.targetMapId).toBe('garden');
    expect(OUTDOOR_LANDMARKS).toHaveLength(10);
  });

  it('default spawn and portals are walkable', () => {
    expect(isOutdoorBlocked(OUTDOOR_DEFAULT_SPAWN.tileX, OUTDOOR_DEFAULT_SPAWN.tileY)).toBe(false);
    const portal = getMapDefinition('outdoor').portals[0]!;
    expect(isOutdoorBlocked(portal.tileX, portal.tileY)).toBe(false);
  });

  it('ocean and map border are blocked', () => {
    expect(isOutdoorBlocked(32, 60)).toBe(true);
    expect(isOutdoorBlocked(0, 10)).toBe(true);
    expect(isOutdoorBlocked(63, 10)).toBe(true);
  });

  it('every landmark lies in a named zone', () => {
    for (const lm of OUTDOOR_LANDMARKS) {
      expect(zoneAtTile(lm.tileX, lm.tileY)).toBeTruthy();
    }
  });

  it('main spine reaches near each landmark from porch spawn', () => {
    const spawn = OUTDOOR_DEFAULT_SPAWN;
    for (const lm of OUTDOOR_LANDMARKS) {
      let ok = bfsReachable(spawn, { tileX: lm.tileX, tileY: lm.tileY }, isOutdoorBlocked, 64);
      if (!ok) {
        for (let dy = -2; dy <= 2 && !ok; dy += 1) {
          for (let dx = -2; dx <= 2 && !ok; dx += 1) {
            ok = bfsReachable(
              spawn,
              { tileX: lm.tileX + dx, tileY: lm.tileY + dy },
              isOutdoorBlocked,
              64,
            );
          }
        }
      }
      expect(ok, `path near ${lm.id}`).toBe(true);
    }
  });
});