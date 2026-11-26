import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyAcceptedDisplacementToLocomotion,
  createLocomotionSnapshot,
  resolveFacingFromVector,
  stepPetLocomotion,
} from '../../src/shared/petLiving/petMovement/petLocomotionModel';
import { PetLivingMainGameDriver } from '../../src/game/pet/PetLivingMainGameDriver';
import { EMPTY_HELD_ITEM, resolveContextualActions } from '../../src/shared/interaction/interactionResolver';
import type { InteractableTarget } from '../../src/shared/interaction/interactionTypes';
import {
  getStaticZonePropBlockedTiles,
  getStaticZonePropSpecs,
} from '../../src/shared/world/zonePropColliders';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

describe('Cat 2D Navigation, Collision & Contextual Priority (A3/A4/A5)', () => {
  it('never faces opposite to movement vector and updates facing immediately on diagonal reversal', () => {
    expect(resolveFacingFromVector(8, -10, 'south')).toBe('north');
    expect(resolveFacingFromVector(-10, -4, 'south')).toBe('west');
    expect(resolveFacingFromVector(0, 12, 'north')).toBe('south');

    let snap = createLocomotionSnapshot(100, 100); // default facing 'south'
    snap = stepPetLocomotion(snap, {
      intent: 'move',
      targetX: 140,
      targetY: 20, // diagonal north-east while starting south
      dtSec: 0.05,
      nowMs: 1000,
    });
    expect(snap.facing === 'north' || snap.facing === 'east').toBe(true);
    expect(snap.facing).not.toBe('south');

    const rested = applyAcceptedDisplacementToLocomotion(snap, snap.x, snap.y, 0.05, 'move', 1100, 'north');
    expect(rested.vx).toBe(0);
    expect(rested.vy).toBe(0);
    expect(rested.animState).toBe('sit_north');
  });

  it('detours cleanly around walls without clipping and sits calmly when owner is unreachable', () => {
    // 1. Sealed river/wall separating cat at x=2 from owner at x=8 -> must stay on walkable side and sit
    const driverSealed = new PetLivingMainGameDriver(2 * 16 + 8, 5 * 16 + 8);
    const sealedWall = (tx: number, ty: number) => tx === 5 || tx < 0 || ty < 0 || tx > 12 || ty > 12;
    for (let i = 0; i < 40; i += 1) {
      const out = driverSealed.update({
        mapId: 'village',
        placements: [],
        nowMs: 1000 + i * 50,
        dtMs: 50,
        isStudying: false,
        partnersSittingSofa: false,
        localPlayerX: 8 * 16 + 8,
        localPlayerY: 5 * 16 + 8,
        caregiverIds: ['a', 'b'],
        foodOffer: null,
        tilePx: 16,
        isTileBlocked: sealedWall,
      });
      const tx = Math.floor(out.loco.x / 16);
      expect(tx).toBeLessThan(5);
      expect(sealedWall(tx, Math.floor(out.loco.y / 16))).toBe(false);
    }

    // 2. Map transition from home -> village snaps cleanly onto walkable owner side
    const driverTransition = new PetLivingMainGameDriver(13 * 16 + 8, 10 * 16 + 8);
    driverTransition.update({
      mapId: 'home',
      placements: [],
      nowMs: 100,
      dtMs: 50,
      isStudying: false,
      partnersSittingSofa: false,
      localPlayerX: 8 * 16 + 8,
      localPlayerY: 9 * 16 + 8,
      caregiverIds: ['a', 'b'],
      foodOffer: null,
      tilePx: 16,
    });
    const afterPortal = driverTransition.update({
      mapId: 'village',
      placements: [],
      nowMs: 200,
      dtMs: 50,
      isStudying: false,
      partnersSittingSofa: false,
      localPlayerX: 42 * 16 + 8,
      localPlayerY: 30 * 16 + 8,
      caregiverIds: ['a', 'b'],
      foodOffer: null,
      tilePx: 16,
      isTileBlocked: (tx, ty) => tx === 41 && ty === 30,
    });
    expect(Math.hypot(afterPortal.loco.x - (42 * 16 + 8), afterPortal.loco.y - (30 * 16 + 8))).toBeLessThan(40);
    expect(Math.floor(afterPortal.loco.x / 16) === 41 && Math.floor(afterPortal.loco.y / 16) === 30).toBe(false);
  });

  it('repairs garden bridge, cabacos cliff/rail/roof layers, and unified Hollowmere colliders', () => {
    const garden = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/assets/maps/garden.json'), 'utf8'));
    const gCol: number[] = garden.layers.find((l: { name: string }) => l.name === 'Collision').data;
    expect(gCol[9 * garden.width + 7]).toBe(0);
    expect(gCol[9 * garden.width + 8]).toBe(0);
    expect(gCol[10 * garden.width + 7]).toBe(0);
    expect(gCol[10 * garden.width + 8]).toBe(0);
    expect(gCol[9 * garden.width + 5]).toBe(1);
    expect(gCol[10 * garden.width + 11]).toBe(1);

    const village = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/assets/maps/village.json'), 'utf8'));
    const vCol: number[] = village.layers.find((l: { name: string }) => l.name === 'Collision').data;
    const vw: number = village.width;
    expect(vCol[21 * vw + 9]).toBe(66); // bridge rail north
    expect(vCol[23 * vw + 9]).toBe(66); // bridge rail south
    expect(vCol[25 * vw + 7]).toBe(66); // west island south cliff
    expect(vCol[26 * vw + 74]).toBe(66); // beach crate top
    expect(vCol[26 * vw + 71]).toBe(66); // beach booth roof
    expect(village.layers.some((l: { name: string }) => l.name === 'olw_roof_overhang')).toBe(true);

    const farmBlocked = getStaticZonePropBlockedTiles('farm');
    expect(farmBlocked.has('9,22')).toBe(true); // windmill expanded base
    expect(getStaticZonePropSpecs('farm').some((s) => s.id === 'hollowmere_windmill')).toBe(true);
  });

  it('prioritizes NPCs, plots, and water sources ahead of portals and allows watering can refills', () => {
    const overlapTargets: InteractableTarget[] = [
      { id: 'village_home_door', kind: 'portal', labelVi: 'Vào nhà', x: 100, y: 100, maxRadiusPx: 40 },
      { id: 'npc:be_na', kind: 'shop_npc', labelVi: 'Trò chuyện · Bé Na', x: 108, y: 100, maxRadiusPx: 44 },
    ];
    const resolvedNpc = resolveContextualActions({
      playerX: 100,
      playerY: 100,
      facing: 'right',
      heldItem: EMPTY_HELD_ITEM,
      interactables: overlapTargets,
    });
    expect(resolvedNpc.primary?.code).toBe('talk_npc');

    const waterAction = resolveContextualActions({
      playerX: 100,
      playerY: 100,
      facing: 'up',
      heldItem: {
        slotIndex: 1,
        itemSku: 'tool_watering_can',
        itemKind: 'tool',
        iconId: null,
        labelVi: 'Bình tưới',
        waterFillLevel: 20,
        quality: 'normal',
        temporaryActionState: 'none',
      },
      interactables: [
        { id: 'village_plaza_well', kind: 'water_source', labelVi: 'Giếng', x: 100, y: 80, maxRadiusPx: 52 },
      ],
    });
    expect(waterAction.primary?.code).toBe('fill_water_pitcher');
    expect(waterAction.primary?.available).toBe(true);
  });
});
