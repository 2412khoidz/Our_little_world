import { describe, expect, it } from 'vitest';
import { buildTiledWorldInteractableTargets } from '../../src/shared/world/tiledWorldInteractables';

describe('buildTiledWorldInteractableTargets', () => {
  it('hides shipping bin when economy preview is off', () => {
    const off = buildTiledWorldInteractableTargets('farm', false);
    expect(off.some((t) => t.kind === 'shipping_bin')).toBe(false);
  });

  it('marks shipping bin playable when economy preview is on', () => {
    const on = buildTiledWorldInteractableTargets('farm', true);
    const bin = on.find((t) => t.kind === 'shipping_bin');
    expect(bin?.donorPlayable).toBe(true);
    expect(bin?.labelVi).toContain('Thùng gom');
  });
});