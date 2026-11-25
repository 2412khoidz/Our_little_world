import { describe, expect, it } from 'vitest';
import { buildTiledWorldInteractableTargets } from '../../src/shared/world/tiledWorldInteractables';
import { resolveContextualActions, EMPTY_HELD_ITEM } from '../../src/shared/interaction/interactionResolver';
import { TILED_INTERACTABLE_SKIP_IDS } from '../../src/shared/interaction/economyInteractablePolicy';

describe('forest/farm economy interactables', () => {
  it('exposes forest canvas stream tension fishing when economy on', () => {
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
    expect(res.primary?.code).toBe('open_donor_stream_fishing');
    expect(res.primary?.donorFishingSpotId).toBe('east_stream');
    expect(res.primary?.available).toBe(true);
  });

  it('hides forest fishing when economy preview is off', () => {
    const targets = buildTiledWorldInteractableTargets('forest', false);
    expect(targets.some((t) => t.id === 'forest_canvas_stream')).toBe(false);
  });

  it('farm barn is mill workshop (no dead barn door prompt)', () => {
    expect(TILED_INTERACTABLE_SKIP_IDS.has('farm_barn_door')).toBe(true);
    const targets = buildTiledWorldInteractableTargets('farm', true);
    expect(targets.some((t) => t.id === 'farm_barn_door')).toBe(false);
    const mill = targets.find((t) => t.id === 'farm_barn_mill')!;
    expect(mill.workshopFocus).toBe('mill');
    expect(mill.donorPlayable).toBe(true);
    const res = resolveContextualActions({
      playerX: mill.x,
      playerY: mill.y,
      facing: 'down',
      heldItem: EMPTY_HELD_ITEM,
      interactables: targets,
      economyPlayable: true,
    });
    expect(res.primary?.code).toBe('open_donor_workshop');
    expect(res.primary?.workshopFocus).toBe('mill');
    expect(res.primary?.available).toBe(true);
  });
});