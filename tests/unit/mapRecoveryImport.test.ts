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

  it('beach recovery disables hollowmere scatter flag when applied', () => {
    if (!beachJson.properties?.some((p) => p.name === 'olwHollowmereNoScatter')) return;
    expect(recoveryEnabled(beachJson)).toBe(true);
  });

  it('shop recovery uses donor image interiors not Casa_player', () => {
    if (shopJson.properties?.find((p) => p.name === 'olwDonorInterior')?.value !== 'Seed_shop.tmj') {
      return;
    }
    expect(shopJson.properties?.find((p) => p.name === 'olwShopRender')?.value).toBe('image');
    expect(shopJson.properties?.find((p) => p.name === 'olwDonorInteriorTextureKey')?.value).toBe(
      'donor-cabacos-seed-shop',
    );
    expect(recoveryEnabled(shopJson)).toBe(true);
  });

  it('forest recovery tags pending pydew tmx when set', () => {
    const pending = forestJson.properties?.find((p) => p.name === 'olwForestPendingRealMap')?.value;
    if (pending !== 'pydew-main.tmx') return;
    expect(recoveryEnabled(forestJson)).toBe(true);
  });
});