import { describe, expect, it } from 'vitest';
import farmJson from '../../public/assets/maps/farm.json';
import beachJson from '../../public/assets/maps/beach.json';
import shopJson from '../../public/assets/maps/shop.json';
import forestJson from '../../public/assets/maps/forest.json';
import { validateFarmPlotContract } from '../../scripts/lib/preserveFarmPlotContract.mjs';

const recoveryEnabled = (json: { properties?: { name: string; value: unknown }[] }) =>
  json.properties?.some((p) => p.name === 'olwRecovery' && String(p.value).includes('8e4454d'));

describe('map recovery import contract', () => {
  it('farm keeps 184 plots when native soil mode is on', () => {
    if (!farmJson.properties?.some((p) => p.name === 'olwFarmNativeSoil' && p.value === true)) {
      expect(validateFarmPlotContract(farmJson).plotCount).toBe(184);
      return;
    }
    const check = validateFarmPlotContract(farmJson);
    expect(check.plotCount).toBe(184);
    const pendingSoil = check.errors.every((e) => e.includes('migration pending'));
    expect(check.ok || pendingSoil, check.errors.join('; ')).toBe(true);
    expect(farmJson.layers.some((l) => l.name === 'OLW_ContractSoil')).toBe(false);
    expect(recoveryEnabled(farmJson)).toBe(true);
  });

  it('beach recovery uses Cabacos east coast when tagged', () => {
    const cabacosPrimary = beachJson.properties?.some(
      (p) => p.name === 'olwBeachCabacosPrimary' && p.value === true,
    );
    if (!cabacosPrimary) {
      if (!beachJson.properties?.some((p) => p.name === 'olwHollowmereNoScatter')) return;
      expect(recoveryEnabled(beachJson)).toBe(true);
      return;
    }
    expect(beachJson.properties?.find((p) => p.name === 'olwDonor')?.value).toBe('cabacos');
    expect(recoveryEnabled(beachJson)).toBe(true);
    expect(beachJson.tilesets?.some((t) => t.name === 'ts_map')).toBe(true);
  });

  it('shop recovery uses seeds_market tiled render not Casa_player', () => {
    if (shopJson.properties?.find((p) => p.name === 'olwDonorInterior')?.value !== 'seeds_market_overworld_slice') {
      return;
    }
    expect(shopJson.properties?.find((p) => p.name === 'olwShopRender')?.value).toBe('tiled');
    expect(shopJson.tilesets?.length).toBeGreaterThan(0);
    expect(recoveryEnabled(shopJson)).toBe(true);
  });

  it('forest recovery tags pending pydew tmx when set', () => {
    const pending = forestJson.properties?.find((p) => p.name === 'olwForestPendingRealMap')?.value;
    if (pending !== 'pydew-main.tmx') return;
    expect(recoveryEnabled(forestJson)).toBe(true);
  });
});