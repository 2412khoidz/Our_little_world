import { describe, expect, it } from 'vitest';
import { buildTiledWorldInteractableTargets } from '../../src/shared/world/tiledWorldInteractables';
import { resolveContextualActions, EMPTY_HELD_ITEM } from '../../src/shared/interaction/interactionResolver';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';

describe('village/beach economy interactables', () => {
  it('exposes Cabacos seed shop and crop market when preview economy is on', () => {
    const targets = buildTiledWorldInteractableTargets('village', true);
    const seed = targets.find((t) => t.id === 'cabacos_player_seed_shop_door');
    const market = targets.find((t) => t.id === 'cabacos_player_crop_market_door');
    expect(seed?.donorPlayable).toBe(true);
    expect(market?.donorPlayable).toBe(true);
    expect(targets.some((t) => t.id === 'cabacos_player_town_hall_door')).toBe(false);
    expect(targets.some((t) => t.id.startsWith('cabacos_sign_'))).toBe(false);
  });

  it('resolves village seed shop J to farm market when playable', () => {
    const targets = buildTiledWorldInteractableTargets('village', true);
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
});