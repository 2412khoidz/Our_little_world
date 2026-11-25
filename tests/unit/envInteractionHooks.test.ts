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

  it('marks village forest links as ladder', () => {
    const hook = resolveEnvHookForTravel('village', 'forest', 'village-to-forest');
    expect(hook).toMatchObject({ kind: 'ladder', hookId: 'village_forest_ladder' });
  });
});