import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTiledWorldMap, type TiledWorldMapJson } from '../../src/shared/world/parseTiledWorldMap';
import { getMapDefinition } from '../../src/shared/maps';

describe('independent Gull Bay coastal beach reconstruction', () => {
  it('parses 56×36 native 16px layout with village portal & open boardwalk', () => {
    const raw = fs.readFileSync(path.join(process.cwd(), 'src/assets/maps/beach.json'), 'utf8');
    const json = JSON.parse(raw) as TiledWorldMapJson & {
      properties?: { name: string; value: string }[];
    };
    const parsed = parseTiledWorldMap(json);
    expect(parsed.widthTiles).toBe(56);
    expect(parsed.heightTiles).toBe(36);
    expect(json.tilewidth).toBe(16);
    expect(parsed.portals.some((p) => p.id === 'beach-to-village')).toBe(true);
    const donor = json.properties?.find((p) => p.name === 'olwDonor')?.value;
    const donorMap = json.properties?.find((p) => p.name === 'olwDonorMap')?.value;
    expect(donor).toBe('cabacos');
    expect(donorMap).toBe('gull_bay_independent_coast_v2');
    expect(parsed.blockedTiles.size).toBeGreaterThan(200);
    const beachDef = getMapDefinition('beach');
    expect(beachDef.isStaticBlocked(1, 16)).toBe(false);
    expect(beachDef.isStaticBlocked(5, 16)).toBe(false);
  });
});
