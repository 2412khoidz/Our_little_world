import { describe, expect, it, vi } from 'vitest';
import {
  DEMO_E_WORLD_ZONE_IDS,
  isDemoEWorldZone,
  isPrivateAtlasReady,
  shouldRenderDemoEWorldZone,
} from './privateArtCapability';

vi.mock('../art/atlasProfile', () => ({
  USE_PRIVATE_ART: true,
}));

describe('privateArtCapability', () => {
  it('lists extended zones for Demo E atlas', () => {
    expect(DEMO_E_WORLD_ZONE_IDS).toEqual(['village', 'farm', 'forest', 'beach', 'shop']);
    expect(isDemoEWorldZone('village')).toBe(true);
    expect(isDemoEWorldZone('garden')).toBe(false);
  });

  it('requires both private flag and loaded textures', () => {
    const scene = {
      textures: {
        exists: (key: string) => key === 'world-atlas' || key === 'world-props-atlas',
      },
    } as never;
    expect(isPrivateAtlasReady(scene)).toBe(true);
    expect(shouldRenderDemoEWorldZone(scene, 'village')).toBe(true);
    expect(shouldRenderDemoEWorldZone(scene, 'garden')).toBe(false);
  });
});