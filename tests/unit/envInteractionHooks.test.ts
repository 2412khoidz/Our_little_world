import { describe, expect, it } from 'vitest';
import {
  resolveEnvHookForPortal,
  resolveEnvHookForTravel,
} from '../../src/shared/world/envInteractionHooks';

describe('envInteractionHooks', () => {
  it('resolves home garden door portal id', () => {
    const hook = resolveEnvHookForPortal('home', 'door-to-garden');
    expect(hook).toMatchObject({ kind: 'door', hookId: 'home_garden_door', toMapId: 'garden' });
  });

  it('uses cottage-to-home id for garden exit', () => {
    const hook = resolveEnvHookForPortal('garden', 'cottage-to-home');
    expect(hook).toMatchObject({ kind: 'door', hookId: 'garden_home_door' });
  });

  it('marks farm north road links to forest as zone_warp and preserves ladder fallback', () => {
    const hook = resolveEnvHookForTravel('farm', 'forest', 'farm-to-forest');
    expect(hook).toMatchObject({ kind: 'zone_warp', hookId: 'farm_forest_path' });
  });
});