import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLivingPetLocalSimulationEnabled } from '../../src/shared/petLiving/mainGame/petLivingDevFlag';
import { buildMainGamePetAffordances } from '../../src/shared/petLiving/mainGame/petMainGameAffordances';
import { buildDefaultStarterPlacements } from '../../src/shared/catalog';
import { PetLivingMainGameDriver } from '../../src/game/pet/PetLivingMainGameDriver';
import { createDefault8Needs } from '../../src/shared/petLiving/petIntelligenceConfig';
import { TILE_SIZE } from '../../src/shared/maps';

describe('Mission 04B-3A — main game living pet', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('defaults canonical living pet simulation ON while allowing DEV ?living-pet=0 opt-out', () => {
    expect(isLivingPetLocalSimulationEnabled()).toBe(true);
    vi.stubEnv('DEV', true);
    vi.stubGlobal('window', { location: { search: '?living-pet=0' } });
    expect(isLivingPetLocalSimulationEnabled()).toBe(false);
  });

  it('builds home affordances with furniture collision awareness', () => {
    const placements = buildDefaultStarterPlacements('world-1', 'owner', new Date(0).toISOString());
    const list = buildMainGamePetAffordances({
      mapId: 'home',
      placements,
      petX: 8 * TILE_SIZE,
      petY: 9 * TILE_SIZE,
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
    });
    expect(list.some((a) => a.targetId === 'food_bowl')).toBe(true);
    expect(list.every((a) => a.distance >= 0)).toBe(true);
  });

  it('runs local driver ticks without throwing (3 min simulated)', () => {
    const driver = new PetLivingMainGameDriver(13.5 * TILE_SIZE, 10.2 * TILE_SIZE);
    driver.seedFromSnapshot({
      id: 'p1',
      worldId: 'w',
      species: 'cat-orange',
      name: 'Quýt',
      vitals: { hunger: 55, energy: 60, fun: 50 },
      emotion: 'cozy',
      mapId: 'home',
      anchorTileX: 13,
      anchorTileY: 10,
      lastFedAtMs: null,
      lastWateredAtMs: null,
      lastPettedAtMs: null,
      simStateAtMs: 0,
      version: 1,
      updatedAt: '',
      serverNowMs: 0,
    });
    const placements = buildDefaultStarterPlacements('world-1', 'owner', new Date(0).toISOString());
    let lastX = 0;
    let moves = 0;
    for (let t = 0; t < 180_000; t += 100) {
      const out = driver.update({
        mapId: 'home',
        placements,
        nowMs: t,
        dtMs: 100,
        isStudying: t > 60_000 && t < 120_000,
        partnersSittingSofa: false,
        localPlayerX: 11 * TILE_SIZE,
        localPlayerY: 8 * TILE_SIZE,
        caregiverIds: ['a', 'b'],
        foodOffer: null,
      });
      if (Math.abs(out.loco.x - lastX) > 2) moves += 1;
      lastX = out.loco.x;
    }
    expect(moves).toBeGreaterThan(10);
    expect(driver).toBeDefined();
    expect(createDefault8Needs().hunger).toBeGreaterThanOrEqual(25);
  });
});