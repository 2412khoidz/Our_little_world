import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTiledWorldMap, type TiledWorldMapJson } from '../../src/shared/world/parseTiledWorldMap';

describe('donor Cabacos village transplant', () => {
  it('parses collision and OLW portals', () => {
    const raw = fs.readFileSync(path.join(process.cwd(), 'src/assets/maps/village.json'), 'utf8');
    const parsed = parseTiledWorldMap(JSON.parse(raw) as TiledWorldMapJson);
    expect(parsed.widthTiles).toBe(86);
    expect(parsed.heightTiles).toBe(48);
    expect(parsed.blockedTiles.size).toBeGreaterThan(100);
    expect(parsed.portals.some((p) => p.targetMapId === 'garden')).toBe(true);
    expect(
      parsed.portals.some((p) => p.targetMapId === 'shop_seed' || p.targetMapId === 'shop'),
    ).toBe(true);
  });
});