import { describe, expect, it } from 'vitest';
import farmJson from '../../public/assets/maps/farm.json';
import forestJson from '../../public/assets/maps/forest.json';
import {
  PYDEW_DONOR_DEPTH_ORDER,
  PYDEW_DONOR_SKIP_LAYERS,
} from '../../src/game/world/renderDonorPydewMap';
import { getMapDefinition, getMapTilePixelSize } from '../../src/shared/maps';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';
import { validateFarmPlotContract } from '../../scripts/lib/preserveFarmPlotContract.mjs';

describe('Unified 16px farm donor render & collision contract', () => {
  it('renders native 16px Cabacos/Hollowmere farm with water, soil, and paths layers', () => {
    expect(getMapTilePixelSize('farm')).toBe(16);
    expect(farmJson.tilewidth).toBe(16);
    expect(farmJson.properties?.find((p) => p.name === 'olwDonor')?.value).toBe('cabacos');
    const water = farmJson.layers.find((l) => l.name === 'water');
    const land = farmJson.layers.find((l) => l.name === 'land');
    const soil = farmJson.layers.find((l) => l.name === 'soil');
    expect(water?.data?.filter((g) => g > 0).length ?? 0).toBeGreaterThan(20);
    expect(land?.data?.filter((g) => g > 0).length ?? 0).toBeGreaterThan(2000);
    expect(soil?.data?.filter((g) => g > 0).length ?? 0).toBe(184);
    expect(PYDEW_DONOR_DEPTH_ORDER[0]).toBe('Water');
    expect(PYDEW_DONOR_SKIP_LAYERS.has('Water')).toBe(false);
  });

  it('keeps 184 plot contract and walkable farm soil', () => {
    const check = validateFarmPlotContract(farmJson) as { ok: boolean; errors: string[]; plotCount: number; walkable?: number };
    expect(check.plotCount).toBe(184);
    expect(check.walkable).toBe(184);
    expect(check.ok, check.errors.join('; ')).toBe(true);
    const def = getMapDefinition('farm');
    const parsed = getParsedTiledWorld('farm')!;
    for (const portal of def.portals) {
      expect(isTileBlockedFromParsed(parsed, portal.tileX, portal.tileY)).toBe(false);
    }
  });

  it('forest keeps Tuxemon donor art (not pydew glade)', () => {
    expect(forestJson.properties?.find((p) => p.name === 'olwDonor')?.value).toBe('tuxemon');
  });

  it('beach ↔ village uses named walkable portals on parsed maps', () => {
    const village = getParsedTiledWorld('village')!;
    const beach = getParsedTiledWorld('beach')!;
    const vToB = village.portals.find((p) => p.id === 'village-to-beach');
    const bToV = beach.portals.find((p) => p.id === 'beach-to-village');
    expect(vToB?.targetMapId).toBe('beach');
    expect(bToV?.targetMapId).toBe('village');
    for (const [parsed, portal] of [
      [village, vToB!] as const,
      [beach, bToV!] as const,
    ]) {
      expect(isTileBlockedFromParsed(parsed, portal.tileX, portal.tileY)).toBe(false);
    }
  });
});
