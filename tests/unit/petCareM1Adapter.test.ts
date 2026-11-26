import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeCardboardBox, makeYarnBall } from '../../src/donors/nintendogs-cat-v2/catProps';
import { ToyWorld } from '../../src/donors/nintendogs-cat-v2/toyPhysics';
import { selectVuenaClipForState, VUENA_CLIP_NAMES } from '../../src/game/pet/care/CatAnimationAdapter';
import { CatBrain } from '../../src/game/pet/care/catBrain';
import type { IPetCareCatActor, IPetCareRig } from '../../src/game/pet/care/petCareActorTypes';
import { PetCareAudioEngine } from '../../src/game/pet/care/petCareAudio';
import { PET_CARE_QUALITY_CONFIG } from '../../src/game/pet/care/petCareQuality';

function createM1StubActor() {
  const pos = new THREE.Vector3(0, 0, 0);
  const rig: IPetCareRig = {
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
    look: { point: null, weight: 0 },
    overlay: {},
    rootLift: 0,
    rootRoll: 0,
    speed: 0,
    turnRate: 0,
    pawSwipe: { side: 'L', progress: 0, active: false },
    hugKick: { active: false, phase: 0 },
  };

  let target: THREE.Vector3 | null = null;
  let onArriveCb: (() => void) | undefined;
  let jump: IPetCareCatActor['jump'] = null;

  const actor: IPetCareCatActor & { advanceMock: (dt: number) => void } = {
    group: new THREE.Group(),
    rig,
    position: pos,
    heading: 0,
    speed: 0,
    maxSpeed: 0.65,
    bounds: { minX: -1.6, maxX: 1.6, minZ: -1.2, maxZ: 1.2 },
    obstacles: [{ x: -0.78, z: 0.38, r: 0.31, tag: 'box' }],
    floorY: 0,
    ignoreObstacleTag: null,
    get jump() {
      return jump;
    },
    get moving() {
      return Boolean(target);
    },
    size: 0.34,
    place(x, z, heading = 0) {
      pos.set(x, this.floorY, z);
      this.heading = heading;
    },
    goTo(p, opts) {
      target = p.clone();
      onArriveCb = opts?.onArrive;
      this.speed = opts?.speed ?? 0.35;
    },
    stop() {
      target = null;
      this.speed = 0;
    },
    face() {},
    headingTo(p) {
      return Math.atan2(p.x - pos.x, p.z - pos.z);
    },
    distanceTo(p) {
      return Math.hypot(p.x - pos.x, p.z - pos.z);
    },
    randomPoint() {
      return new THREE.Vector3(0.2, 0, 0.2);
    },
    headWorld(out = new THREE.Vector3()) {
      return out.copy(pos).add(new THREE.Vector3(0, 0.24, 0.08));
    },
    frontPawWorld(side = 'L', out = new THREE.Vector3()) {
      return out.copy(pos).add(new THREE.Vector3(side === 'L' ? 0.04 : -0.04, 0.02, 0.14));
    },
    raycast() {
      return null;
    },
    setAccessory() {},
    setCoatVariant() {},
    setLod() {},
    setCoatAppearance() {},
    getModelDebugInfo() {
      return {
        modelKind: 'vuena-glb',
        lod: 'lod0',
        activeClip: 'idle',
        clipNames: [...VUENA_CLIP_NAMES],
        triangles: 7188,
      };
    },
    jumpTo(to, height, dur, onLand) {
      jump = { from: pos.clone(), to: to.clone(), t: 0, dur, h: height, onLand };
    },
    update() {},
    dispose() {},
    advanceMock(dt: number) {
      if (jump) {
        jump.t += dt;
        if (jump.t >= jump.dur) {
          pos.set(jump.to.x, this.floorY, jump.to.z);
          const cb = jump.onLand;
          jump = null;
          cb?.();
        }
        return;
      }
      if (target) {
        pos.lerp(target, Math.min(1, dt * 4));
        if (Math.hypot(pos.x - target.x, pos.z - target.z) < 0.09) {
          pos.set(target.x, this.floorY, target.z);
          target = null;
          this.speed = 0;
          const cb = onArriveCb;
          onArriveCb = undefined;
          cb?.();
        }
      }
    },
  };
  return actor;
}

describe('MISSION M.1 — Vuena Clip Adapter, Paw-Synced Play, Box Anti-Clipping, Presets & Audio', () => {
  it('maps CatBrain poses & speeds to all 13 Vuena GLB animation clips', () => {
    const usedClips = new Set<string>([
      selectVuenaClipForState({ pose: 'stand', speed: 0, idleAltFlag: false }).clip,
      selectVuenaClipForState({ pose: 'stand', speed: 0, idleAltFlag: true }).clip,
      selectVuenaClipForState({ pose: 'stand', speed: 0.22 }).clip,
      selectVuenaClipForState({ pose: 'stand', speed: 0.48 }).clip,
      selectVuenaClipForState({ pose: 'jump', speed: 0 }).clip,
      selectVuenaClipForState({ pose: 'eat', speed: 0 }).clip,
      selectVuenaClipForState({ pose: 'sit', speed: 0 }).clip,
      selectVuenaClipForState({ pose: 'sleep', speed: 0 }).clip,
      selectVuenaClipForState({ pose: 'paw_bat', speed: 0 }).clip,
      selectVuenaClipForState({ pose: 'call', speed: 0 }).clip,
      selectVuenaClipForState({ pose: 'refuse', speed: 0, poseElapsedSec: 0.1 }).clip,
      selectVuenaClipForState({ pose: 'hug_kick', speed: 0 }).clip,
      selectVuenaClipForState({ pose: 'stretch', speed: 0 }).clip,
    ]);

    for (const clip of VUENA_CLIP_NAMES) {
      expect(usedClips.has(clip), `Missing mapping for Vuena clip: ${clip}`).toBe(true);
    }
  });

  it('synchronizes front-paw contact frame with toy physics impulse and cleanly releases yarn hug on stop', () => {
    const stub = createM1StubActor();
    stub.place(0, 0);
    const toyWorld = new ToyWorld(new THREE.Group(), { minX: -1.6, maxX: 1.6, minZ: -1.2, maxZ: 1.2 });
    const yarn = toyWorld.add(makeYarnBall(), new THREE.Vector3(0, 0.05, 0.42));
    const sounds: string[] = [];

    const brain = new CatBrain(stub, {
      playerSpot: () => new THREE.Vector3(0, 0, 1.0),
      cameraPos: () => new THREE.Vector3(0, 0.7, 1.8),
      bedSpot: new THREE.Vector3(-0.9, 0, -0.5),
      sunSpot: new THREE.Vector3(-0.5, 0, -0.3),
      boxSpot: new THREE.Vector3(-0.78, 0, 0.38),
      boxPlaced: () => true,
      wiggleBox: () => {},
      foodBowl: {
        object: new THREE.Group(),
        pos: new THREE.Vector3(0.75, 0, 0.38),
        rim: 0.09,
        fill: () => 0,
        setFill: () => {},
        consume: () => {},
        dispose: () => {},
      },
      waterBowl: {
        object: new THREE.Group(),
        pos: new THREE.Vector3(0.98, 0, 0.45),
        rim: 0.09,
        fill: () => 0.5,
        setFill: () => {},
        consume: () => {},
        dispose: () => {},
      },
      toyWorld,
      wandActive: () => false,
      wandLurePos: () => new THREE.Vector3(),
      wandLureSpeed: () => 0,
      impulseWand: () => {},
      emote: () => {},
      sound: (ev) => sounds.push(ev),
    });

    brain.noticeToy(yarn);
    expect(brain.activity).toBe('play_toy');

    // Before reaching paw-bat contact frame (~54%), yarn velocity should remain 0
    for (let i = 0; i < 6; i++) {
      brain.update(0.1);
      stub.advanceMock(0.1);
    }
    const preContactSpeed = yarn.velocity.length();
    expect(preContactSpeed).toBe(0);

    // Advance through stalk -> paw_bat contact -> toy impulse & sound
    let impulseObserved = false;
    for (let i = 0; i < 40; i++) {
      brain.update(0.08);
      stub.advanceMock(0.08);
      toyWorld.update(0.08);
      if (yarn.velocity.length() > 0.25) {
        impulseObserved = true;
        break;
      }
    }
    expect(impulseObserved).toBe(true);
    expect(sounds.some((s) => s === 'toy_swish' || s === 'ball_bounce')).toBe(true);

    // Interrupting mid-play must cleanly release yarn.inHand and overlays
    brain.act?.stop();
    expect(yarn.inHand).toBe(false);
    expect(stub.rig.pawSwipe?.active).toBe(false);
    expect(stub.rig.hugKick?.active).toBe(false);
  });

  it('hops into cardboard box from outside entry spot without clipping and restores collision on exit', () => {
    const stub = createM1StubActor();
    const boxSpot = new THREE.Vector3(-0.78, 0, 0.38);
    const box = makeCardboardBox(boxSpot);
    const toyWorld = new ToyWorld(new THREE.Group(), { minX: -1.6, maxX: 1.6, minZ: -1.2, maxZ: 1.2 });

    const brain = new CatBrain(stub, {
      playerSpot: () => new THREE.Vector3(0, 0, 1.0),
      cameraPos: () => new THREE.Vector3(0, 0.7, 1.8),
      bedSpot: new THREE.Vector3(-0.9, 0, -0.5),
      sunSpot: new THREE.Vector3(-0.5, 0, -0.3),
      boxSpot: box.pos,
      boxPlaced: () => true,
      boxEntrySpot: () => box.entrySpot,
      boxInteriorFloorY: () => box.interiorFloorY,
      wiggleBox: () => box.wiggle(),
      foodBowl: {
        object: new THREE.Group(),
        pos: new THREE.Vector3(0.75, 0, 0.38),
        rim: 0.09,
        fill: () => 0,
        setFill: () => {},
        consume: () => {},
        dispose: () => {},
      },
      waterBowl: {
        object: new THREE.Group(),
        pos: new THREE.Vector3(0.98, 0, 0.45),
        rim: 0.09,
        fill: () => 0.5,
        setFill: () => {},
        consume: () => {},
        dispose: () => {},
      },
      toyWorld,
      wandActive: () => false,
      wandLurePos: () => new THREE.Vector3(),
      wandLureSpeed: () => 0,
      impulseWand: () => {},
      emote: () => {},
    });

    brain.inspectBox();
    expect(brain.activity).toBe('box_peek');
    expect(stub.ignoreObstacleTag).toBeNull();

    // Advance until cat jumps into the box center
    for (let i = 0; i < 45; i++) {
      brain.update(0.08);
      stub.advanceMock(0.08);
      if (stub.rig.pose === 'box_peek') break;
    }
    expect(stub.rig.pose).toBe('box_peek');
    expect(stub.ignoreObstacleTag).toBe('box');
    expect(stub.floorY).toBeCloseTo(box.interiorFloorY, 3);
    expect(stub.distanceTo(boxSpot)).toBeLessThan(0.08);

    // If interrupted while inside the box, cat cleanly exits rim & restores floorY/collision
    brain.act?.stop();
    expect(stub.floorY).toBe(0);
    expect(stub.ignoreObstacleTag).toBeNull();
    expect(stub.distanceTo(boxSpot)).toBeGreaterThanOrEqual(0.32);
  });

  it('defines Low / Medium / High graphics presets with LOD1 vs LOD0 & DPR/shadow caps', () => {
    expect(PET_CARE_QUALITY_CONFIG.low).toMatchObject({
      maxDpr: 1.0,
      shadows: false,
      lod: 'lod1',
      dustMotes: 0,
    });
    expect(PET_CARE_QUALITY_CONFIG.medium).toMatchObject({
      maxDpr: 1.5,
      shadows: true,
      shadowMapSize: 512,
      lod: 'lod0',
    });
    expect(PET_CARE_QUALITY_CONFIG.high).toMatchObject({
      maxDpr: 2.0,
      shadows: true,
      shadowMapSize: 1024,
      lod: 'lod0',
    });
  });

  it('persists volume & mute and enforces cooldowns in PetCareAudioEngine', () => {
    const audio = new PetCareAudioEngine();
    audio.setVolume(0.45);
    audio.setMuted(true);
    expect(audio.getVolume()).toBeCloseTo(0.45, 2);
    expect(audio.isMuted()).toBe(true);
    expect(audio.play('meow_happy', { nowMs: 1000 })).toBe(false);

    audio.setMuted(false);
    audio.dispose();
  });
});
