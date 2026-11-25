import { describe, expect, it } from 'vitest';
import { buildPetAuthorityMovementPlan } from '../../src/shared/petLiving/petMovement/petAuthorityMovementPlan';

describe('petAuthorityMovementPlan', () => {
  it('rejects fake affordance for eat_bowl', () => {
    const res = buildPetAuthorityMovementPlan({
      mapId: 'home',
      startTileX: 13,
      startTileY: 9,
      actionId: 'eat_bowl',
      targetAffordanceId: 'sofa',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('TARGET_MISMATCH');
  });

  it('plans reachable path from default pet anchor to food bowl', () => {
    const res = buildPetAuthorityMovementPlan({
      mapId: 'home',
      startTileX: 13,
      startTileY: 9,
      actionId: 'eat_bowl',
      targetAffordanceId: 'food_bowl',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.plan.destTileX).toBe(12);
      expect(res.plan.destTileY).toBe(10);
      expect(res.plan.pathSteps).toBeGreaterThan(0);
      expect(res.plan.travelMs).toBeGreaterThanOrEqual(400);
      expect(res.plan.performMs).toBeGreaterThanOrEqual(3000);
    }
  });

  it('plans water bowl separately from food bowl', () => {
    const res = buildPetAuthorityMovementPlan({
      mapId: 'home',
      startTileX: 13,
      startTileY: 9,
      actionId: 'drink_water',
      targetAffordanceId: 'water_bowl',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.plan.destTileX).toBe(13);
      expect(res.plan.destTileY).toBe(10);
    }
  });
});