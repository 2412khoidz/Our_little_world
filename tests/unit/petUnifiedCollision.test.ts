import { describe, expect, it } from 'vitest';
import { PetLivingMainGameDriver } from '../../src/game/pet/PetLivingMainGameDriver';
import { mapWorldPetStateToOlwCatAnim } from '../../src/shared/petLiving/petMovement/livingCatWorldAnimMap';
import { getMapDefinition, TILE_SIZE } from '../../src/shared/maps';
import { buildMovementCollisionGrid } from '../../src/shared/placement';
import {
  computeActorSeparationPush,
  isBlockedByActorColliders,
  NPC_ACTOR_RADIUS_PX,
  PET_ACTOR_RADIUS_PX,
  PLAYER_ACTOR_RADIUS_PX,
} from '../../src/shared/movement/actorCollision';
import type { FurniturePlacement, MapId } from '../../src/shared/types';

function makeBlockedFn(mapId: MapId, placements: readonly FurniturePlacement[] = []) {
  const def = getMapDefinition(mapId);
  const grid = buildMovementCollisionGrid(mapId, placements);
  return {
    def,
    grid,
    isBlocked: (tx: number, ty: number) =>
      tx < 0 || ty < 0 || tx >= def.widthTiles || ty >= def.heightTiles || grid.has(`${tx},${ty}`),
  };
}

function assertFootprintClear(
  x: number,
  y: number,
  isBlocked: (tx: number, ty: number) => boolean,
): void {
  const rx = 4.2;
  const ry = 3.2;
  const pts: readonly [number, number][] = [
    [x, y],
    [x - rx, y - ry],
    [x + rx, y - ry],
    [x - rx, y + 1.5],
    [x + rx, y + 1.5],
  ];
  for (const [cx, cy] of pts) {
    const tx = Math.floor(cx / TILE_SIZE);
    const ty = Math.floor(cy / TILE_SIZE);
    expect(isBlocked(tx, ty), `Cat footprint point (${cx.toFixed(1)},${cy.toFixed(1)}) -> tile (${tx},${ty}) is blocked`).toBe(false);
  }
}

describe('Unified Pet 2D Collision & Actor Collision across Real Map Geometry', () => {
  it('obeys static obstacles, fences, bridges, ladders, and dynamically placed furniture across all 6 maps without wall penetration', () => {
    const cases: Array<{
      mapId: MapId;
      start: [number, number];
      ownerTargets: Array<[number, number]>;
      placements?: FurniturePlacement[];
    }> = [
      {
        mapId: 'home',
        start: [13.5, 10.2],
        ownerTargets: [
          [3.5, 8.5],
          [11.5, 4.5],
          [8.0, 9.5],
        ],
        placements: [
          {
            id: 'wall-sofa',
            worldId: 'w-test',
            mapId: 'home',
            sku: 'sofa_cream',
            layerSlot: 'object',
            tileX: 8,
            tileY: 7,
            widthTiles: 2,
            heightTiles: 1,
            updatedBy: 'u1',
            updatedAt: '2026-11-26T00:00:00Z',
          },
        ],
      },
      {
        mapId: 'garden',
        start: [8.5, 5.5],
        ownerTargets: [
          [7.5, 12.2], // Across south pond bridge
          [2.0, 7.5],
        ],
      },
      {
        mapId: 'village',
        start: [42.5, 31.5],
        ownerTargets: [
          [26.5, 17.5],
          [26.5, 4.5],  // Onto North Causeway Bridge
          [46.5, 6.5],  // Up the unblocked village cliff ladder (46, 7..10)
        ],
      },
      {
        mapId: 'farm',
        start: [29.5, 22.5],
        ownerTargets: [
          [29.5, 3.5],  // North dirt road beside Pond 0
          [44.5, 22.5],
        ],
      },
      {
        mapId: 'forest',
        start: [8.5, 36.5],
        ownerTargets: [
          [13.5, 29.5],
          [14.5, 20.5],
        ],
      },
      {
        mapId: 'beach',
        start: [4.5, 16.5],
        ownerTargets: [
          [22.5, 16.5],
          [33.5, 16.5], // Pier
        ],
      },
    ];

    for (const tc of cases) {
      const { isBlocked } = makeBlockedFn(tc.mapId, tc.placements ?? []);
      const driver = new PetLivingMainGameDriver(tc.start[0] * TILE_SIZE, tc.start[1] * TILE_SIZE);
      driver.resetMapPosition(tc.mapId, tc.start[0] * TILE_SIZE, tc.start[1] * TILE_SIZE);
      let nowMs = 1000;

      for (const [ox, oy] of tc.ownerTargets) {
        for (let step = 0; step < 90; step += 1) {
          nowMs += 32;
          const out = driver.update({
            mapId: tc.mapId,
            placements: tc.placements ?? [],
            nowMs,
            dtMs: 32,
            isStudying: false,
            partnersSittingSofa: false,
            localPlayerX: ox * TILE_SIZE,
            localPlayerY: oy * TILE_SIZE,
            caregiverIds: ['u1', 'u2'],
            foodOffer: null,
            tilePx: TILE_SIZE,
            isTileBlocked: isBlocked,
          });
          assertFootprintClear(out.loco.x, out.loco.y, isBlocked);

          // Anim state & facing must stay synchronized with Frakassets map
          const mappedAnim = mapWorldPetStateToOlwCatAnim(out.loco.animState);
          expect(mappedAnim).toMatch(/olw-cat-(Walk|Idle|Happy|Sleep)_(North|South|East|West)/);
          if (out.loco.animState.startsWith('walk_') || out.loco.animState.startsWith('run_')) {
            expect(out.loco.animState.endsWith(`_${out.loco.facing}`)).toBe(true);
            expect(Math.hypot(out.loco.vx, out.loco.vy)).toBeGreaterThan(0.5);
          }
        }
      }
    }
  });

  it('never teleports across walls on same-map currentUnwalkable and waits calmly when owner is unreachable', () => {
    const initialPlacements: FurniturePlacement[] = [];
    const { isBlocked: isBlockedOpen } = makeBlockedFn('home', initialPlacements);
    const driver = new PetLivingMainGameDriver(4.5 * TILE_SIZE, 8.5 * TILE_SIZE);
    driver.resetMapPosition('home', 4.5 * TILE_SIZE, 8.5 * TILE_SIZE);

    // Step once to establish lastValidPos on left side of home
    driver.update({
      mapId: 'home',
      placements: initialPlacements,
      nowMs: 1000,
      dtMs: 32,
      isStudying: false,
      partnersSittingSofa: false,
      localPlayerX: 5.0 * TILE_SIZE,
      localPlayerY: 8.5 * TILE_SIZE,
      caregiverIds: ['u1', 'u2'],
      foodOffer: null,
      tilePx: TILE_SIZE,
      isTileBlocked: isBlockedOpen,
    });

    // Drop a bookshelf directly onto cat's standing tile while owner stands far right on (13.5, 6.5)
    const trappedPlacements: FurniturePlacement[] = [
      {
        id: 'trap-shelf',
        worldId: 'w-test',
        mapId: 'home',
        sku: 'bookshelf_warm',
        layerSlot: 'object',
        tileX: 4,
        tileY: 8,
        widthTiles: 1,
        heightTiles: 1,
        updatedBy: 'u1',
        updatedAt: '2026-11-26T00:00:00Z',
      },
    ];
    const { isBlocked: isBlockedTrap } = makeBlockedFn('home', trappedPlacements);
    const out = driver.update({
      mapId: 'home',
      placements: trappedPlacements,
      nowMs: 1064,
      dtMs: 32,
      isStudying: false,
      partnersSittingSofa: false,
      localPlayerX: 13.5 * TILE_SIZE,
      localPlayerY: 6.5 * TILE_SIZE,
      caregiverIds: ['u1', 'u2'],
      foodOffer: null,
      tilePx: TILE_SIZE,
      isTileBlocked: isBlockedTrap,
    });
    assertFootprintClear(out.loco.x, out.loco.y, isBlockedTrap);
    // Must stay on left side (< 8 tiles), NEVER teleport to owner at tile 13.5
    expect(out.loco.x).toBeLessThan(8 * TILE_SIZE);

    // Unreachable owner on an isolated cliff / sea tile across river in village -> waits calmly
    const { isBlocked: isBlockedVillage } = makeBlockedFn('village');
    const vDriver = new PetLivingMainGameDriver(42.5 * TILE_SIZE, 31.5 * TILE_SIZE);
    vDriver.resetMapPosition('village', 42.5 * TILE_SIZE, 31.5 * TILE_SIZE);
    let ms = 2000;
    for (let i = 0; i < 20; i += 1) {
      ms += 32;
      const vOut = vDriver.update({
        mapId: 'village',
        placements: [],
        nowMs: ms,
        dtMs: 32,
        isStudying: false,
        partnersSittingSofa: false,
        localPlayerX: 78.5 * TILE_SIZE, // sea island isolated by water
        localPlayerY: 12.5 * TILE_SIZE,
        caregiverIds: ['u1', 'u2'],
        foodOffer: null,
        tilePx: TILE_SIZE,
        isTileBlocked: isBlockedVillage,
      });
      assertFootprintClear(vOut.loco.x, vOut.loco.y, isBlockedVillage);
      expect(vOut.loco.animState.startsWith('walk_') || vOut.loco.animState.startsWith('run_')).toBe(false);
    }
  });

  it('reconciles rapid direction flips without backward moonwalking', () => {
    const { isBlocked } = makeBlockedFn('farm');
    const driver = new PetLivingMainGameDriver(29.5 * TILE_SIZE, 22.5 * TILE_SIZE);
    driver.resetMapPosition('farm', 29.5 * TILE_SIZE, 22.5 * TILE_SIZE);
    let ms = 1000;

    // Move east first
    let lastOut = driver.update({
      mapId: 'farm',
      placements: [],
      nowMs: ms,
      dtMs: 32,
      isStudying: false,
      partnersSittingSofa: false,
      localPlayerX: 35.5 * TILE_SIZE,
      localPlayerY: 22.5 * TILE_SIZE,
      caregiverIds: ['u1', 'u2'],
      foodOffer: null,
      tilePx: TILE_SIZE,
      isTileBlocked: isBlocked,
    });
    for (let i = 0; i < 12; i += 1) {
      ms += 32;
      lastOut = driver.update({
        mapId: 'farm',
        placements: [],
        nowMs: ms,
        dtMs: 32,
        isStudying: false,
        partnersSittingSofa: false,
        localPlayerX: 35.5 * TILE_SIZE,
        localPlayerY: 22.5 * TILE_SIZE,
        caregiverIds: ['u1', 'u2'],
        foodOffer: null,
        tilePx: TILE_SIZE,
        isTileBlocked: isBlocked,
      });
    }
    expect(lastOut.loco.facing).toBe('east');
    expect(lastOut.loco.animState).toMatch(/^(walk|run)_east$/);

    // Flip owner rapidly to the west -> cat must not move west while still rendering east walk
    for (let i = 0; i < 15; i += 1) {
      ms += 32;
      lastOut = driver.update({
        mapId: 'farm',
        placements: [],
        nowMs: ms,
        dtMs: 32,
        isStudying: false,
        partnersSittingSofa: false,
        localPlayerX: 22.5 * TILE_SIZE,
        localPlayerY: 22.5 * TILE_SIZE,
        caregiverIds: ['u1', 'u2'],
        foodOffer: null,
        tilePx: TILE_SIZE,
        isTileBlocked: isBlocked,
      });
      if (lastOut.loco.vx < -1) {
        expect(lastOut.loco.facing).toBe('west');
        expect(lastOut.loco.animState).toMatch(/^(walk|run)_west$/);
      }
    }
    expect(lastOut.loco.facing).toBe('west');
  });

  it('accelerates smoothly from rest, runs/walks/decelerates, reverses cleanly, and rounds corners across 30, 60, and 120 FPS', () => {
    const { isBlocked } = makeBlockedFn('farm');
    const distancesAfter1s: number[] = [];

    for (const fps of [30, 60, 120] as const) {
      const dtMs = 1000 / fps;
      const driver = new PetLivingMainGameDriver(28.5 * TILE_SIZE, 22.5 * TILE_SIZE);
      driver.resetMapPosition('farm', 28.5 * TILE_SIZE, 22.5 * TILE_SIZE);

      let nowMs = 1000;
      const speeds: number[] = [];
      const anims: string[] = [];
      const framesFor1s = fps;

      // 1. Accelerate from rest toward owner 144px east (must run cleanly without crawling or sit flashes)
      for (let i = 0; i < framesFor1s; i += 1) {
        nowMs += dtMs;
        const out = driver.update({
          mapId: 'farm',
          placements: [],
          nowMs,
          dtMs,
          isStudying: false,
          partnersSittingSofa: false,
          localPlayerX: 37.5 * TILE_SIZE,
          localPlayerY: 22.5 * TILE_SIZE,
          caregiverIds: ['u1', 'u2'],
          foodOffer: null,
          tilePx: TILE_SIZE,
          isTileBlocked: isBlocked,
        });
        assertFootprintClear(out.loco.x, out.loco.y, isBlocked);
        speeds.push(Math.hypot(out.loco.vx, out.loco.vy));
        anims.push(out.loco.animState);
      }

      // First few acceleration frames must strictly build speed and NEVER falsely drop into sit_*
      expect(speeds[0]).toBeGreaterThan(0.9);
      expect(speeds[1]).toBeGreaterThan(speeds[0]!);
      expect(speeds[2]).toBeGreaterThan(speeds[1]!);
      expect(anims.some((a) => a.startsWith('sit_'))).toBe(false);
      // Should ramp to sustained run speed (> 50 px/s) within 1 second
      expect(Math.max(...speeds)).toBeGreaterThan(50);

      const endPos = driver.update({
        mapId: 'farm',
        placements: [],
        nowMs: nowMs + dtMs,
        dtMs,
        isStudying: false,
        partnersSittingSofa: false,
        localPlayerX: 37.5 * TILE_SIZE,
        localPlayerY: 22.5 * TILE_SIZE,
        caregiverIds: ['u1', 'u2'],
        foodOffer: null,
        tilePx: TILE_SIZE,
        isTileBlocked: isBlocked,
      });
      distancesAfter1s.push(endPos.loco.x - 28.5 * TILE_SIZE);

      // 2. Continue moving to fixed owner until deceleration & settled idle near owner
      let settledOut = endPos;
      for (let i = 0; i < fps * 4; i += 1) {
        nowMs += dtMs;
        settledOut = driver.update({
          mapId: 'farm',
          placements: [],
          nowMs,
          dtMs,
          isStudying: false,
          partnersSittingSofa: false,
          localPlayerX: 37.5 * TILE_SIZE,
          localPlayerY: 22.5 * TILE_SIZE,
          caregiverIds: ['u1', 'u2'],
          foodOffer: null,
          tilePx: TILE_SIZE,
          isTileBlocked: isBlocked,
        });
      }
      expect(Math.hypot(37.5 * TILE_SIZE - settledOut.loco.x, 22.5 * TILE_SIZE - settledOut.loco.y)).toBeLessThan(32);
      expect(Math.hypot(settledOut.loco.vx, settledOut.loco.vy)).toBeLessThan(1);

      // 3. Reverse west while keeping hysteresis sane on brief jitter
      const reverseAnims: string[] = [];
      for (let i = 0; i < Math.ceil(fps * 0.7); i += 1) {
        nowMs += dtMs;
        const rOut = driver.update({
          mapId: 'farm',
          placements: [],
          nowMs,
          dtMs,
          isStudying: false,
          partnersSittingSofa: false,
          localPlayerX: 25.5 * TILE_SIZE,
          localPlayerY: 22.5 * TILE_SIZE,
          caregiverIds: ['u1', 'u2'],
          foodOffer: null,
          tilePx: TILE_SIZE,
          isTileBlocked: isBlocked,
        });
        reverseAnims.push(rOut.loco.animState);
      }
      expect(reverseAnims[reverseAnims.length - 1]).toMatch(/^(walk|run)_west$/);

      // 4. Smooth corner navigation around an L-shaped barrier at all 3 frame rates
      const cornerBlocked = (tx: number, ty: number) =>
        tx < 0 || ty < 0 || tx > 20 || ty > 20 || (tx === 8 && ty >= 3 && ty <= 8);
      const cornerDriver = new PetLivingMainGameDriver(5.5 * TILE_SIZE, 6.5 * TILE_SIZE);
      cornerDriver.resetMapPosition('farm', 5.5 * TILE_SIZE, 6.5 * TILE_SIZE);
      let cNow = 5000;
      const cornerSpeeds: number[] = [];
      let reachedRightSide = false;
      for (let i = 0; i < fps * 4; i += 1) {
        cNow += dtMs;
        const cOut = cornerDriver.update({
          mapId: 'farm',
          placements: [],
          nowMs: cNow,
          dtMs,
          isStudying: false,
          partnersSittingSofa: false,
          localPlayerX: 11.5 * TILE_SIZE,
          localPlayerY: 6.5 * TILE_SIZE,
          caregiverIds: ['u1', 'u2'],
          foodOffer: null,
          tilePx: TILE_SIZE,
          isTileBlocked: cornerBlocked,
        });
        assertFootprintClear(cOut.loco.x, cOut.loco.y, cornerBlocked);
        cornerSpeeds.push(Math.hypot(cOut.loco.vx, cOut.loco.vy));
        if (cOut.loco.x > 9.5 * TILE_SIZE) {
          reachedRightSide = true;
          break;
        }
      }
      expect(reachedRightSide).toBe(true);
      // After initial ramp, must maintain steady speed around corners instead of stalling
      const steadyCornerSpeeds = cornerSpeeds.slice(Math.max(4, Math.floor(fps * 0.2)));
      expect(Math.min(...steadyCornerSpeeds)).toBeGreaterThan(20);
    }

    // Distance after 1.0s simulated time must match consistently across 30, 60, and 120 FPS
    const spread = Math.max(...distancesAfter1s) - Math.min(...distancesAfter1s);
    expect(spread).toBeLessThan(3.5);
  });

  it('keeps chicken chasing & separation push disabled while owner is adjacent', () => {
    const { isBlocked } = makeBlockedFn('farm');
    const driver = new PetLivingMainGameDriver(29.5 * TILE_SIZE, 22.5 * TILE_SIZE);
    driver.resetMapPosition('farm', 29.5 * TILE_SIZE, 22.5 * TILE_SIZE);
    const out = driver.update({
      mapId: 'farm',
      placements: [],
      nowMs: 2000,
      dtMs: 16.667,
      isStudying: false,
      partnersSittingSofa: false,
      localPlayerX: 29.5 * TILE_SIZE + 2,
      localPlayerY: 22.5 * TILE_SIZE,
      caregiverIds: ['u1', 'u2'],
      foodOffer: null,
      tilePx: TILE_SIZE,
      isTileBlocked: isBlocked,
      nearestChickenDistPx: 24,
    });
    expect(out.loco.x).toBe(29.5 * TILE_SIZE);
    expect(out.loco.y).toBe(22.5 * TILE_SIZE);
  });

  it('prevents actor stacking between player, NPC, and cat without trapping overlapping actors', () => {
    const npc = { id: 'bac_hai', x: 100, y: 100, radiusPx: NPC_ACTOR_RADIUS_PX, kind: 'npc' as const };
    const cat = { id: 'pet-cat', x: 140, y: 100, radiusPx: PET_ACTOR_RADIUS_PX, kind: 'pet' as const };

    // Moving inward into NPC blocks
    expect(isBlockedByActorColliders(98, 100, 88, 100, PLAYER_ACTOR_RADIUS_PX, [npc])).toBe(true);
    // Moving outward when already overlapping is allowed (anti-trap)
    expect(isBlockedByActorColliders(94, 100, 99, 100, PLAYER_ACTOR_RADIUS_PX, [npc])).toBe(false);
    // Cat separation vector pushes away cleanly from NPC/player overlap
    const push = computeActorSeparationPush(102, 100, PET_ACTOR_RADIUS_PX, [npc, cat]);
    expect(push).not.toBeNull();
    expect(push!.dx).toBeGreaterThan(0);
  });
});
