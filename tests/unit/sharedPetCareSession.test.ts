import { describe, expect, it } from 'vitest';
import {
  createSharedPetCareSession,
  mergeSharedPetCareSession,
} from '../../src/shared/petLiving/petCare/sharedPetCareSession';

describe('sharedPetCareSession', () => {
  it('merges stroke and feed patches with monotonic revision', () => {
    const base = createSharedPetCareSession('world-a', 'pet-1', 1000);
    const afterStroke = mergeSharedPetCareSession(base, {
      kind: 'stroke',
      zone: 'head',
      actorUserId: 'u1',
      atMs: 1100,
    });
    expect(afterStroke.revision).toBe(1);
    expect(afterStroke.physical.fun).toBeGreaterThan(base.physical.fun);
    const afterFeed = mergeSharedPetCareSession(afterStroke, {
      kind: 'feed',
      itemSku: 'pet_kibble_basic',
      actorUserId: 'u2',
      atMs: 1200,
    });
    expect(afterFeed.revision).toBe(2);
    expect(afterFeed.lastActorUserId).toBe('u2');
    expect(afterFeed.physical.hunger).toBeGreaterThan(afterStroke.physical.hunger);
  });
});