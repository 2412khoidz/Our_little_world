import { describe, expect, it } from 'vitest';
import { validateFarmPlotContract } from '../../scripts/lib/preserveFarmPlotContract.mjs';
import farmJson from '../../public/assets/maps/farm.json';
import beachJson from '../../public/assets/maps/beach.json';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';

describe('donor farm/beach sketch', () => {
  it('farm.json passes 184-plot contract after cabacos sketch import', () => {
    const check = validateFarmPlotContract(farmJson);
    expect(check.ok, check.errors.join('; ')).toBe(true);
    expect(check.plotCount).toBe(184);
    const donor = (farmJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwDonorSketch',
    );
    expect(donor?.value).toBe('farm-v1-deep');
    const tilesets = (farmJson as { tilesets?: { name: string }[] }).tilesets?.map((t) => t.name) ?? [];
    expect(tilesets).toContain('ts_map');
    expect(farmJson.layers.some((l) => l.name === 'OLW_ContractSoil')).toBe(true);
  });

  it('beach has donor interactables for Gull Bay pier/sign', () => {
    const parsed = getParsedTiledWorld('beach');
    expect(parsed).not.toBeNull();
    const names = parsed!.interactableSpawns.map((s) => s.id);
    expect(names).toContain('beach_gull_bay_sign');
    expect(names).toContain('beach_pier_fishing');
    const polish = (beachJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwCoastPolish',
    );
    expect(polish?.value).toBeTruthy();
  });
});