import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDiscoverabilityMarkerSpecs } from '../../src/game/world/discoverabilityMarkers';
import { getMapDefinition } from '../../src/shared/maps';
import {
  CANONICAL_PORTAL_EDGES,
  getArrivalFacingForPortal,
  getIslandZoneMeta,
  getPortalShortLabelVi,
  validateWorldGraphReciprocity,
} from '../../src/shared/world/worldGraph';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

describe('Canonical Island World Graph & Portal Beacons (B1/B2)', () => {
  it('validates complete portal reciprocity, walkable landings, and anti-ping-pong clearance', () => {
    const res = validateWorldGraphReciprocity(getMapDefinition);
    expect(res.errors, res.errors.join('\n')).toEqual([]);
    expect(res.ok).toBe(true);
    expect(CANONICAL_PORTAL_EDGES.length).toBeGreaterThanOrEqual(18);
  });

  it('connects village-to-garden at NW archway gate (7,11) instead of water edge (6,22) and reaches Town Square', () => {
    const village = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/assets/maps/village.json'), 'utf8'));
    const vDef = getMapDefinition('village');
    const portal = vDef.portals.find((p) => p.id === 'village-to-garden');
    expect(portal).toBeDefined();
    expect(portal?.tileX).toBe(7);
    expect(portal?.tileY).toBe(11);
    expect(portal?.targetSpawnX).toBe(8);
    expect(portal?.targetSpawnY).toBe(11);
    expect(getArrivalFacingForPortal('village-to-garden')).toBe('up');
    expect(getArrivalFacingForPortal('garden-to-village')).toBe('down');

    // BFS walkability from Town Square (42, 31) to NW gate (7, 11)
    const col: number[] = village.layers.find((l: { name: string }) => l.name === 'Collision').data;
    const w: number = village.width;
    const h: number = village.height;
    const start = '42,31';
    const vis = new Set<string>([start]);
    const queue: Array<[number, number]> = [[42, 31]];
    const dirs: readonly [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = `${nx},${ny}`;
        if (vis.has(k) || col[ny * w + nx] !== 0) continue;
        vis.add(k);
        queue.push([nx, ny]);
      }
    }
    expect(vis.has('7,11')).toBe(true);
    expect(vis.has('7,13')).toBe(true);
  });

  it('generates TeaMobi-style directional portal beacons directly from canonical portal registry with clean copy', () => {
    for (const mapId of ['home', 'garden', 'farm', 'village', 'forest', 'beach'] as const) {
      const def = getMapDefinition(mapId);
      const specs = buildDiscoverabilityMarkerSpecs(mapId, []);
      for (const portal of def.portals) {
        if (portal.targetMapId === mapId) continue;
        const expectedId =
          portal.id === 'village-to-beach' ? 'marker-gull-bay-beach' : `marker-portal-${portal.id}`;
        const hit = specs.find((s) => s.id === expectedId);
        expect(hit, `Missing beacon for ${mapId}:${portal.id}`).toBeDefined();
        expect(hit?.portalMeta).toBeDefined();
        expect(hit?.glyph).toBe(getPortalShortLabelVi(portal.id, portal.labelVi));
        expect(hit?.glyph).not.toMatch(/tuxemon|cabacos_donor/i);
      }
      expect(getIslandZoneMeta(mapId).nameVi.length).toBeGreaterThan(2);
    }
  });
});
