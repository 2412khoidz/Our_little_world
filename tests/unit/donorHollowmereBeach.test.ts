import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTiledWorldMap, type TiledWorldMapJson } from '../../src/shared/world/parseTiledWorldMap';
import { getMapDefinition } from '../../src/shared/maps';

describe('donor Cabacos east-coast beach transplant', () => {
  it('parses 48×34 layout with village portal', () => {
    const raw = fs.readFileSync(path.join(process.cwd(), 'public/assets/maps/beach.json'), 'utf8');
    const parsed = parseTiledWorldMap(JSON.parse(raw) as TiledWorldMapJson);
    expect(parsed.widthTiles).toBe(48);
    expect(parsed.heightTiles).toBe(34);
    expect(parsed.portals.some((p) => p.id === 'beach-to-village')).toBe(true);
    const donor = (JSON.parse(raw) as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwDonor',
    );
    expect(donor?.value).toBe('cabacos');
    expect(parsed.blockedTiles.size).toBeGreaterThan(50);
    const beachDef = getMapDefinition('beach');
    expect(beachDef.isStaticBlocked(1, 16)).toBe(false);
    expect(beachDef.isStaticBlocked(0, 16)).toBe(false);
  });
});