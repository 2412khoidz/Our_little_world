import { describe, expect, it } from 'vitest';
import { buildTiledWorldInteractableTargets } from '../../src/shared/world/tiledWorldInteractables';
import { resolveContextualActions, EMPTY_HELD_ITEM } from '../../src/shared/interaction/interactionResolver';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';

describe('village/beach economy interactables', () => {
  it('exposes Cabacos shop counters inside donor interiors when preview economy is on', () => {
    const seedTargets = buildTiledWorldInteractableTargets('shop_seed', true);
    const marketTargets = buildTiledWorldInteractableTargets('shop_crop_market', true);
    const seed = seedTargets.find((t) => t.id === 'cabacos_player_seed_shop_door');
    const market = marketTargets.find((t) => t.id === 'cabacos_player_crop_market_door');
    expect(seed?.donorPlayable).toBe(true);
    expect(market?.donorPlayable).toBe(true);
    const villageTargets = buildTiledWorldInteractableTargets('village', true);
    expect(villageTargets.some((t) => t.id === 'cabacos_player_town_hall_door')).toBe(false);
    expect(villageTargets.some((t) => t.id.startsWith('cabacos_sign_'))).toBe(false);
  });

  it('resolves seed shop interior counter J to farm market when playable', () => {
    const targets = buildTiledWorldInteractableTargets('shop_seed', true);
    const shop = targets.find((t) => t.id === 'cabacos_player_seed_shop_door')!;
    const res = resolveContextualActions({
      playerX: shop.x,
      playerY: shop.y,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
      economyPlayable: true,
    });
    expect(res.primary?.code).toBe('open_farm_market');
    expect(res.primary?.available).toBe(true);
  });

  it('maps Gull Bay pier to gull_bay chill fishing spot', () => {
    const targets = buildTiledWorldInteractableTargets('beach', true);
    const pier = targets.find((t) => t.id === 'beach_pier_fishing')!;
    expect(pier.fishingSpotId).toBe('gull_bay');
    const res = resolveContextualActions({
      playerX: pier.x,
      playerY: pier.y,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
      economyPlayable: true,
    });
    expect(res.primary?.code).toBe('open_donor_fishing');
    expect(res.primary?.donorFishingSpotId).toBe('gull_bay');
  });

  it('parsed beach spawn includes fishingSpotId after donor import', () => {
    const parsed = getParsedTiledWorld('beach');
    const pier = parsed?.interactableSpawns.find((s) => s.id === 'beach_pier_fishing');
    expect(pier?.fishingSpotId).toBe('gull_bay');
  });

  it('village Hollow bakery/coop doors open workshop with focus', () => {
    const targets = buildTiledWorldInteractableTargets('village', true);
    const bakery = targets.find((t) => t.id === 'cabacos_village_hollow_bakery')!;
    const coop = targets.find((t) => t.id === 'cabacos_village_hollow_coop')!;
    expect(bakery.donorPlayable).toBe(true);
    expect(bakery.workshopFocus).toBe('bakery');
    expect(coop.workshopFocus).toBe('coop');
    const resBakery = resolveContextualActions({
      playerX: bakery.x,
      playerY: bakery.y,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
      economyPlayable: true,
    });
    expect(resBakery.primary?.code).toBe('open_donor_workshop');
    expect(resBakery.primary?.workshopFocus).toBe('bakery');
    expect(resBakery.primary?.available).toBe(true);
  });

  it('hides Hollow doors when economy preview is off', () => {
    const targets = buildTiledWorldInteractableTargets('village', false);
    expect(targets.some((t) => t.id === 'cabacos_village_hollow_bakery')).toBe(false);
  });
});