import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { DonorPydewToolController, toolKindFromItemSku } from '../../src/game/interaction/donorPydewToolController';
import { PetLivingMainGameDriver } from '../../src/game/pet/PetLivingMainGameDriver';
import { CatAnimationAdapter } from '../../src/game/pet/care/CatAnimationAdapter';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';

function makeMockVuenaRigBones() {
  const root = new THREE.Group();
  const animRoot = new THREE.Group();
  root.add(animRoot);

  const hips = new THREE.Bone();
  hips.name = 'Hips';
  const spine = new THREE.Bone();
  spine.name = 'Spine';
  const head = new THREE.Bone();
  head.name = 'Head';
  const lids = new THREE.Bone();
  lids.name = 'Lids';
  const flU = new THREE.Bone();
  flU.name = 'FrontUpperLeg_L';
  flU.position.set(0.058, 0.0708, 0.0381);
  const flL = new THREE.Bone();
  flL.name = 'FrontLowerLeg_L';
  flL.position.set(0, 0.071, 0);
  const frU = new THREE.Bone();
  frU.name = 'FrontUpperLeg_R';
  frU.position.set(-0.058, 0.0708, 0.0381);
  const frL = new THREE.Bone();
  frL.name = 'FrontLowerLeg_R';
  frL.position.set(0, 0.071, 0);
  const blU = new THREE.Bone();
  blU.name = 'BackUpperLeg_L';
  const blL = new THREE.Bone();
  blL.name = 'BackLowerLeg_L';
  const brU = new THREE.Bone();
  brU.name = 'BackUpperLeg_R';
  const brL = new THREE.Bone();
  brL.name = 'BackLowerLeg_R';

  animRoot.add(hips);
  hips.add(spine);
  spine.add(head, flU, frU);
  head.add(lids);
  flU.add(flL);
  frU.add(frL);
  hips.add(blU, brU);
  blU.add(blL);
  brU.add(brL);

  const bones: Record<string, THREE.Bone> = {
    Hips: hips,
    Spine: spine,
    Head: head,
    Lids: lids,
    FrontUpperLeg_L: flU,
    FrontLowerLeg_L: flL,
    FrontUpperLeg_R: frU,
    FrontLowerLeg_R: frL,
    BackUpperLeg_L: blU,
    BackLowerLeg_L: blL,
    BackUpperLeg_R: brU,
    BackLowerLeg_R: brL,
  };
  return { root, animRoot, bones };
}

describe('Integrated regression fixes (Collisions, Cat walls, PyDew tool lock & Pet IK/Eyelids)', () => {
  it('Cabacos village blocks roofs, green house & fences while keeping open garden portal walkable', () => {
    const village = getParsedTiledWorld('village')!;
    expect(isTileBlockedFromParsed(village, 26, 33)).toBe(true); // tool shop roof
    expect(isTileBlockedFromParsed(village, 27, 35)).toBe(true); // red roof
    expect(isTileBlockedFromParsed(village, 45, 34)).toBe(true); // green house edge
    expect(isTileBlockedFromParsed(village, 53, 31)).toBe(true); // fence row
    const gardenPortal = village.portals.find((p) => p.targetMapId === 'garden')!;
    expect(gardenPortal.tileX).toBe(44);
    expect(gardenPortal.tileY).toBe(31);
    expect(isTileBlockedFromParsed(village, gardenPortal.tileX, gardenPortal.tileY)).toBe(false);
  });

  it('2D pet driver strictly avoids blocked wall/fence tiles when following owner', () => {
    const driver = new PetLivingMainGameDriver(2 * 16 + 8, 5 * 16 + 8);
    // Vertical wall at tile x=4, y=2..8
    const isBlocked = (tx: number, ty: number) => tx === 4 && ty >= 2 && ty <= 8;

    let lastX = 0;
    let lastY = 0;
    for (let step = 0; step < 30; step += 1) {
      const out = driver.update({
        mapId: 'village',
        placements: [],
        nowMs: 1000 + step * 50,
        dtMs: 50,
        isStudying: false,
        partnersSittingSofa: false,
        localPlayerX: 6 * 16 + 8,
        localPlayerY: 5 * 16 + 8,
        caregiverIds: ['a', 'b'],
        foodOffer: null,
        tilePx: 16,
        isTileBlocked: isBlocked,
      });
      lastX = out.loco.x;
      lastY = out.loco.y;
      const tileX = Math.floor(lastX / 16);
      const tileY = Math.floor(lastY / 16);
      expect(isBlocked(tileX, tileY)).toBe(false);
    }
    expect(Number.isFinite(lastX)).toBe(true);
    expect(Number.isFinite(lastY)).toBe(true);
  });

  it('DonorPydewToolController locks movement briefly and triggers onHit at mid-swing', () => {
    expect(toolKindFromItemSku('tool_hoe')).toBe('hoe');
    expect(toolKindFromItemSku('tool_watering_can')).toBe('water');
    const ctrl = new DonorPydewToolController();
    const onHit = vi.fn();

    expect(ctrl.isMovementLocked()).toBe(false);
    ctrl.trigger('hoe', 'right', 100, 100, 16, onHit);
    expect(ctrl.isMovementLocked()).toBe(true);

    ctrl.update(100);
    expect(onHit).not.toHaveBeenCalled();

    ctrl.update(100);
    expect(onHit).toHaveBeenCalledTimes(1);
    expect(ctrl.getState().targetTileX).toBeGreaterThan(Math.floor(100 / 16));

    ctrl.update(200);
    expect(ctrl.isMovementLocked()).toBe(false);
  });

  it('CatAnimationAdapter snaps lids binary (never half-open dark rim) and drives IK front paw on targetWorld', () => {
    const { root, animRoot, bones } = makeMockVuenaRigBones();
    const idleClip = new THREE.AnimationClip('idle', 1, []);
    const adapter = new CatAnimationAdapter(root, animRoot, [idleClip], bones);

    // Even when happy > 0.65, lids are strictly rest (0) or exact GLB closed delta (0, 0.0455, 0.0207)
    adapter.happy = 0.9;
    for (let i = 0; i < 15; i += 1) {
      adapter.update(0.1);
      const y = bones.Lids!.position.y;
      expect(y === 0 || Math.abs(y - 0.0455) < 1e-4).toBe(true);
    }

    // Peak paw_bat IK visibly rotates the targeted shoulder toward a live 3D toy position
    adapter.happy = 0;
    adapter.setPose('paw_bat');
    adapter.pawSwipe = {
      side: 'R',
      progress: 0.56,
      active: true,
      targetWorld: new THREE.Vector3(-0.08, 0.04, 0.25),
    };
    const restRot = bones.FrontUpperLeg_R!.quaternion.clone();
    adapter.update(0.016);
    expect(bones.FrontUpperLeg_R!.quaternion.angleTo(restRot)).toBeGreaterThan(0.15);

    // Smooth hug_kick side roll applies root roll without death freeze clip
    adapter.pawSwipe.active = false;
    adapter.setPose('hug_kick');
    adapter.hugKick = { active: true, phase: 0.45 };
    adapter.update(0.2);
    expect(adapter.activeClip).toBe('idle');
    expect(animRoot.rotation.z).toBeGreaterThan(0.3);
  });
});
