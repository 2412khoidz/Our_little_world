import { describe, expect, it } from 'vitest';
import { validateFarmPlotContract } from '../../scripts/lib/preserveFarmPlotContract.mjs';
import farmJson from '../../src/assets/maps/farm.json';
import beachJson from '../../src/assets/maps/beach.json';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';

describe('donor farm/beach sketch', () => {
  it('farm.json passes 184-plot contract after cabacos sketch import', () => {
    const check = validateFarmPlotContract(farmJson);
    const nativeSoil = (farmJson as { properties?: { name: string; value: unknown }[] }).properties?.some(
      (p) => p.name === 'olwFarmNativeSoil' && p.value === true,
    );
    if (!nativeSoil) {
      expect(check.ok, check.errors.join('; ')).toBe(true);
    } else {
      expect(check.plotCount).toBe(184);
      const pendingSoil = check.errors.every((e) => e.includes('migration pending'));
      expect(check.ok || pendingSoil, check.errors.join('; ')).toBe(true);
    }
    expect(check.plotCount).toBe(184);
    const donor = (farmJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwDonor',
    );
    expect(['cabacos', 'pydew-valley']).toContain(donor?.value);
    const sketch = (farmJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwDonorSketch',
    );
    expect(['farm-v1-deep', 'farm-recovery-native', 'pydew-valley-tmx-v1', 'farm-v2-deep']).toContain(sketch?.value);
    expect((farmJson as { tilewidth?: number }).tilewidth).toBe(16);
    if (donor?.value === 'pydew-valley') {
      expect((farmJson as { tilewidth?: number }).tilewidth).toBe(64);
      expect(farmJson.layers.some((l) => l.name === 'Farmable')).toBe(true);
    } else {
      const tilesets = (farmJson as { tilesets?: { name: string }[] }).tilesets?.map((t) => t.name) ?? [];
      expect(tilesets).toContain('ts_map');
    }
    if (nativeSoil) {
      expect(farmJson.layers.some((l) => l.name === 'OLW_ContractSoil')).toBe(false);
    } else {
      expect(farmJson.layers.some((l) => l.name === 'OLW_ContractSoil')).toBe(true);
    }
  });

  it('beach has donor interactables for Gull Bay pier/sign', () => {
    const parsed = getParsedTiledWorld('beach');
    expect(parsed).not.toBeNull();
    const names = parsed!.interactableSpawns.map((s) => s.id);
    expect(names).toContain('beach_gull_bay_sign');
    expect(names).toContain('beach_pier_fishing');
    expect(names).toContain('beach_lifebuoy_post');
    const polish = (beachJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwCoastPolish',
    );
    expect(['2025-11-25-pier-lifebuoy', 'recovery-authored-only', 'cabacos-east-coast-native', 'gull-bay-coastal-v2']).toContain(
      polish?.value,
    );
    const hdRef = (beachJson as { properties?: { name: string; value: string }[] }).properties?.find(
      (p) => p.name === 'olwHarvestDuoRef',
    );
    expect(hdRef?.value).toBe('beach-layout-reference.v1');
  });
});