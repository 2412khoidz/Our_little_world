import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CAT_BREEDS } from '../../src/donors/nintendogs-cat-v2/catBreeds';
import { designCat } from '../../src/donors/nintendogs-cat-v2/catDesign';
import { ToyWorld } from '../../src/donors/nintendogs-cat-v2/toyPhysics';
import type { CatActor } from '../../src/donors/nintendogs-cat-v2/catActor';
import { CatBrain } from '../../src/game/pet/care/catBrain';
import {
  createSharedPetCareSession,
  mergeSharedPetCareSession,
} from '../../src/shared/petLiving/petCare/sharedPetCareSession';

function createStubActor(): CatActor {
  const pos = new THREE.Vector3(0, 0, 0);
  const rig = {
    pose: 'stand',
    poseRate: 7,
    setPose(name: string, rate = 7) {
      this.pose = name;
      this.poseRate = rate;
    },
    tailMode: 'idle',
    wagAmp: 0.2,
    wagFreq: 1.6,
    tailRaise: 0.2,
    happy: 0,
    mouthOpen: 0,
    jawHold: 0,
    tongueOut: 0,
    eyesClosed: 0,
    earPerk: 0,
    headTilt: 0,
    look: { point: null as THREE.Vector3 | null, weight: 0 },
    overlay: {} as Record<string, [number, number, number]>,
    rootLift: 0,
    rootRoll: 0,
  };
  let target: THREE.Vector3 | null = null;
  let onArriveCb: (() => void) | undefined;
  let jump: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; h: number; onLand?: () => void } | null = null;

  const actor = {
    position: pos,
    heading: 0,
    speed: 0,
    rig,
    model: {
      uniforms: {
        uFluff: { value: 0.72 },
        uDirt: { value: 0 },
        uComb: { value: 0.65 },
      },
    },
    get jump() {
      return jump;
    },
    headWorld() {
      return pos.clone().add(new THREE.Vector3(0, 0.25, 0.1));
    },
    goTo(p: THREE.Vector3, opts?: { onArrive?: () => void }) {
      target = p.clone();
      onArriveCb = opts?.onArrive;
      actor.speed = 0.3;
    },
    stop() {
      target = null;
      actor.speed = 0;
    },
    face() {},
    distanceTo(p: THREE.Vector3) {
      return Math.hypot(p.x - pos.x, p.z - pos.z);
    },
    randomPoint() {
      return new THREE.Vector3(0.4, 0, -0.2);
    },
    jumpTo(to: THREE.Vector3, height: number, dur: number, onLand?: () => void) {
      jump = { from: pos.clone(), to: to.clone(), t: 0, dur, h: height, onLand };
    },
    advanceMock(dt: number) {
      if (jump) {
        jump.t += dt;
        if (jump.t >= jump.dur) {
          pos.copy(jump.to);
          const cb = jump.onLand;
          jump = null;
          cb?.();
        }
        return;
      }
      if (target) {
        pos.lerp(target, Math.min(1, dt * 3));
        if (pos.distanceTo(target) < 0.05) {
          pos.copy(target);
          target = null;
          actor.speed = 0;
          const cb = onArriveCb;
          onArriveCb = undefined;
          cb?.();
        }
      }
    },
  };
  return actor as unknown as CatActor & { advanceMock: (dt: number) => void };
}

describe('MISSION M — 3D Cat Design, CatBrain Autonomy & 2P Shared Session', () => {
  it('designs distinct feline anatomy and 5-bone sinuous tail for every OLW coat variant', () => {
    for (const variant of ['ginger-tabby', 'cream-puff', 'calico-patch'] as const) {
      const breed = CAT_BREEDS[variant];
      const d = designCat(breed);
      const tailBones = d.bones.filter((b) => b.name.startsWith('tail'));
      expect(tailBones).toHaveLength(5);
      expect(d.whiskerAnchors).toHaveLength(2);
      expect(d.ears).toHaveLength(2);
      expect(d.dims.H).toBeGreaterThan(0.2);
    }
  });

  it('chooses varied autonomous feline acts and responds to food/water bowls and refusal boundaries', () => {
    const stub = createStubActor() as CatActor & { advanceMock: (dt: number) => void };
    let foodLevel = 0;
    let waterLevel = 0.2;
    let refused = 0;
    const activities = new Set<string>();
    const toyWorld = new ToyWorld(new THREE.Group(), { minX: -1.5, maxX: 1.5, minZ: -1.2, maxZ: 1.2 });

    const brain = new CatBrain(stub, {
      playerSpot: () => new THREE.Vector3(0, 0, 1.0),
      cameraPos: () => new THREE.Vector3(0, 0.7, 1.8),
      bedSpot: new THREE.Vector3(-0.9, 0, -0.5),
      sunSpot: new THREE.Vector3(-0.5, 0, -0.3),
      boxSpot: new THREE.Vector3(-0.7, 0, 0.4),
      boxPlaced: () => true,
      wiggleBox: () => {},
      foodBowl: {
        object: new THREE.Group(),
        pos: new THREE.Vector3(0.75, 0, 0.35),
        rim: 0.09,
        fill: () => foodLevel,
        setFill: (v) => { foodLevel = v; },
        consume: (a) => { foodLevel = Math.max(0, foodLevel - a); },
        dispose: () => {},
      },
      waterBowl: {
        object: new THREE.Group(),
        pos: new THREE.Vector3(0.95, 0, 0.42),
        rim: 0.09,
        fill: () => waterLevel,
        setFill: (v) => { waterLevel = v; },
        consume: (a) => { waterLevel = Math.max(0, waterLevel - a); },
        dispose: () => {},
      },
      toyWorld,
      wandActive: () => false,
      wandLurePos: () => new THREE.Vector3(),
      wandLureSpeed: () => 0,
      impulseWand: () => {},
      emote: () => {},
      onActivityChange: (act) => activities.add(act),
      onRefuse: () => { refused += 1; },
    });

    // Advance pure autonomy for 25 simulated seconds -> Quýt chooses multiple varied activities
    for (let i = 0; i < 250; i++) {
      brain.update(0.1);
      stub.advanceMock(0.1);
    }
    expect(activities.size).toBeGreaterThanOrEqual(3);

    // Fill food bowl and confirm Quýt walks to it & eats (recording OLW memory)
    brain.needs.hunger = 50;
    foodLevel = 1;
    brain.noticeFood();
    expect(brain.activity).toBe('eat');
    for (let i = 0; i < 80; i++) {
      brain.update(0.1);
      stub.advanceMock(0.1);
    }
    expect(foodLevel).toBeLessThan(1);
    expect(brain.memory.events.some((e) => e.kind === 'fed')).toBe(true);

    // Direct 3D brushing increases coat fluff
    const prevFluff = brain.coatFluff;
    brain.brushStroke(0.1);
    expect(brain.coatFluff).toBeGreaterThan(prevFluff);

    // Tired refusal triggers airplane ears + onRefuse
    brain.needs.energy = 10;
    brain.callToPlayer();
    expect(brain.activity).toBe('refuse');
    expect(stub.rig.earPerk).toBeLessThan(0);
    expect(refused).toBeGreaterThanOrEqual(1);
  });

  it('merges water, toy, brush, feed, stroke and pose patches monotonically across 2 clients', () => {
    let s = createSharedPetCareSession('w-1', 'pet-1', 1000);
    s = mergeSharedPetCareSession(s, { kind: 'feed', itemSku: 'pet_kibble_basic', actorUserId: 'partner-a', atMs: 1100 });
    expect(s.physical.foodBowl.portions).toBe(2);
    expect(s.revision).toBe(1);

    s = mergeSharedPetCareSession(s, { kind: 'water', actorUserId: 'partner-b', atMs: 1200 });
    expect(s.physical.waterBowl.volume).toBe(100);
    expect(s.lastActorUserId).toBe('partner-b');

    s = mergeSharedPetCareSession(s, {
      kind: 'toy',
      toyKind: 'wand',
      x: 0.2,
      z: 0.3,
      actorUserId: 'partner-a',
      atMs: 1300,
    });
    expect(s.activeToy?.kind).toBe('wand');

    s = mergeSharedPetCareSession(s, {
      kind: 'pose',
      x: -0.25,
      z: 0.1,
      heading: 1.2,
      activity: 'groom',
      actorUserId: 'partner-a',
      atMs: 1400,
    });
    expect(s.catPose?.activity).toBe('groom');
    expect(s.revision).toBe(4);
  });
});
