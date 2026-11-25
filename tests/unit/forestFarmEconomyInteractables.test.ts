import { describe, expect, it } from 'vitest';
import { buildTiledWorldInteractableTargets } from '../../src/shared/world/tiledWorldInteractables';
import { resolveContextualActions, EMPTY_HELD_ITEM } from '../../src/shared/interaction/interactionResolver';
describe('forest/farm economy interactables', () => {
  it('exposes forest canvas stream fishing when economy on', () => {
    const targets = buildTiledWorldInteractableTargets('forest', true);
    const stream = targets.find((t) => t.id === 'forest_canvas_stream');
    expect(stream?.fishingSpotId).toBe('east_stream');
    expect(stream?.donorPlayable).toBe(true);
    const res = resolveContextualActions({
      playerX: stream!.x,
      playerY: stream!.y,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
      economyPlayable: true,
    });
    expect(res.primary?.code).toBe('open_donor_fishing');
    expect(res.primary?.donorFishingSpotId).toBe('east_stream');
    expect(res.primary?.available).toBe(true);
  });

  it('hides forest fishing when economy preview is off', () => {
    const targets = buildTiledWorldInteractableTargets('forest', false);
    expect(targets.some((t) => t.id === 'forest_canvas_stream')).toBe(false);
  });

  it('farm barn: mill workshop + economy barn door to shop', () => {
    const targets = buildTiledWorldInteractableTargets('farm', true);
    const mill = targets.find((t) => t.id === 'farm_barn_mill')!;
    expect(mill.workshopFocus).toBe('mill');
    expect(mill.donorPlayable).toBe(true);
    const millRes = resolveContextualActions({
      playerX: mill.x,
      playerY: mill.y,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
      economyPlayable: true,
    });
    expect(millRes.primary?.code).toBe('open_donor_workshop');
    expect(millRes.primary?.workshopFocus).toBe('mill');

    const door = targets.find((t) => t.id === 'farm_barn_door')!;
    expect(door.labelVi).toContain('Bác Hai');
    const doorRes = resolveContextualActions({
      playerX: door.x,
      playerY: door.y,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
      economyPlayable: true,
    });
    expect(doorRes.primary?.code).toBe('enter_barn_shop');
    expect(doorRes.primary?.available).toBe(true);
  });
});