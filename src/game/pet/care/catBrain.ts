// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/dog/brain.ts + j4lpan/pet-shop feline expressions
// Bridged directly to OLW shared Pet8Needs, PetPersonalityTraits, MemoryState, and PetAffordances.
import * as THREE from 'three';
import type { CatActor, CatRegion } from '../../../donors/nintendogs-cat-v2/catActor';
import type { BowlHandle } from '../../../donors/nintendogs-cat-v2/catProps';
import type { ToyWorld, WorldToy } from '../../../donors/nintendogs-cat-v2/toyPhysics';
import type { PetSnapshot } from '../../../shared/pet/petTypes';
import {
  appendMemoryEvent,
  createMemoryState,
  type MemoryEventKind,
  type MemoryState,
} from '../../../shared/petAdvanced/primitives/memory';
import {
  createDefault8Needs,
  derive9Emotion,
  PET_PERSONALITY_PRESETS,
  scoreAffordanceAction,
  type Pet8Needs,
  type Pet9Emotion,
  type PetPersonalityTraits,
} from '../../../shared/petLiving/petIntelligenceConfig';
import { PET_MEMORY_PERSIST_CAP } from '../../../shared/petLiving/petPrimitivesAdapter';
import type { CatEmoteKind } from './petCareEffects';

export interface CatBrainEnv {
  playerSpot: () => THREE.Vector3;
  cameraPos: () => THREE.Vector3;
  bedSpot: THREE.Vector3;
  sunSpot: THREE.Vector3;
  boxSpot: THREE.Vector3;
  boxPlaced: () => boolean;
  wiggleBox: () => void;
  foodBowl: BowlHandle;
  waterBowl: BowlHandle;
  toyWorld: ToyWorld;
  wandActive: () => boolean;
  wandLurePos: () => THREE.Vector3;
  wandLureSpeed: () => number;
  impulseWand: (v: THREE.Vector3) => void;
  emote: (kind: CatEmoteKind, worldPos?: THREE.Vector3) => void;
  onActivityChange?: (activity: string, reasonVi?: string) => void;
  onRefuse?: (reason: 'tired' | 'shy' | 'overstimulated') => void;
  onCoatDirtyOrFluff?: (deltaFluff: number) => void;
}

export type CatActivityName =
  | 'idle'
  | 'wander'
  | 'sniff'
  | 'sit'
  | 'loaf'
  | 'sleep'
  | 'stretch'
  | 'groom'
  | 'play_toy'
  | 'chase_wand'
  | 'box_peek'
  | 'eat'
  | 'drink'
  | 'come'
  | 'follow_hand'
  | 'petted'
  | 'brushed'
  | 'refuse';

abstract class CatAct {
  done = false;
  t = 0;
  priority = 0;
  abstract readonly name: CatActivityName;
  constructor(protected readonly b: CatBrain) {}
  start() {}
  abstract step(dt: number): void;
  stop() {}
  get cat() { return this.b.actor; }
  get rig() { return this.b.actor.rig; }
  get env() { return this.b.env; }
  finish() { this.done = true; }
}

class IdleStandOrSitAct extends CatAct {
  readonly name: CatActivityName;
  private lookT = 0;
  constructor(
    b: CatBrain,
    private readonly dur: number,
    private readonly pose: 'stand' | 'sit' | 'lie',
    private readonly watchPlayer = true,
  ) {
    super(b);
    this.name = pose === 'lie' ? 'loaf' : pose === 'sit' ? 'sit' : 'idle';
  }
  start() {
    this.cat.stop();
    this.rig.setPose(this.pose, this.pose === 'stand' ? 6 : 4);
    this.rig.tailMode = this.pose === 'lie' ? 'idle' : 'wag_slow';
    this.rig.earPerk = this.pose === 'sit' ? 0.35 : 0.1;
  }
  step(dt: number) {
    this.lookT -= dt;
    if (this.lookT <= 0) {
      this.lookT = 1.4 + Math.random() * 2.2;
      if (this.watchPlayer && Math.random() < 0.65) {
        this.b.lookAtCamera(0.85);
        // Slow cat affection blink
        if (Math.random() < 0.35) this.rig.happy = Math.max(this.rig.happy, 0.55);
      } else {
        const p = this.cat.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.2, 0.25, (Math.random() - 0.3) * 2.0));
        this.rig.look = { point: p, weight: 0.7 };
      }
      this.rig.headTilt = Math.random() < 0.25 ? (Math.random() - 0.5) * 0.36 : 0;
    }
    if (this.t > this.dur) this.finish();
  }
  stop() {
    this.rig.headTilt = 0;
    this.rig.happy = 0;
  }
}

class WanderAct extends CatAct {
  readonly name = 'wander';
  start() {
    const around = Math.random() < 0.5 ? this.env.sunSpot : new THREE.Vector3(0, 0, 0.15);
    const p = this.cat.randomPoint(1.15, around);
    this.rig.setPose('stand', 6);
    this.rig.tailMode = 'wag_slow';
    this.rig.tailRaise = 0.45;
    this.rig.look = { point: p.clone().setY(0.18), weight: 0.55 };
    this.cat.goTo(p, {
      speed: 0.24 + Math.random() * 0.16,
      arrive: 0.08,
      onArrive: () => this.finish(),
    });
  }
  step() {
    if (this.t > 9) this.finish();
  }
  stop() {
    this.cat.stop();
  }
}

class SniffAct extends CatAct {
  readonly name = 'sniff';
  private phase = 0;
  start() {
    const p = this.cat.randomPoint(0.95, new THREE.Vector3(0, 0, 0.1));
    this.rig.setPose('sniff', 5);
    this.rig.earPerk = 0.5;
    this.cat.goTo(p, {
      speed: 0.17,
      arrive: 0.09,
      onArrive: () => {
        this.phase = 1;
        this.t = 0;
      },
    });
  }
  step() {
    this.rig.overlay.head = [Math.sin(this.b.time * 8) * 0.04, Math.sin(this.b.time * 2.4) * 0.22, 0];
    this.b.needs.stimulation = Math.min(100, this.b.needs.stimulation + 0.02);
    if (this.phase === 1 && this.t > 2.4) this.finish();
    if (this.t > 8) this.finish();
  }
  stop() {
    delete this.rig.overlay.head;
    this.cat.stop();
    this.rig.setPose('stand', 5);
  }
}

class StretchAct extends CatAct {
  readonly name = 'stretch';
  priority = 1;
  start() {
    this.cat.stop();
    this.rig.setPose('stretch', 3.4);
    this.rig.tailRaise = 0.85;
    this.rig.earPerk = 0.4;
    this.env.emote('note', this.cat.headWorld());
  }
  step() {
    this.rig.mouthOpen = this.t > 0.65 && this.t < 1.8 ? 0.95 : 0;
    this.rig.eyesClosed = this.t > 0.6 && this.t < 2.1 ? 0.75 : 0;
    if (this.t > 2.8) this.finish();
  }
  stop() {
    this.rig.mouthOpen = 0;
    this.rig.eyesClosed = 0;
    this.rig.setPose('stand', 5);
  }
}

class GroomAct extends CatAct {
  readonly name = 'groom';
  priority = 1;
  private sparkleDone = false;
  start() {
    this.cat.stop();
    this.rig.setPose('groom', 4.5);
    this.rig.eyesClosed = 0.75;
    this.rig.tailMode = 'idle';
  }
  step(dt: number) {
    const cycle = this.t * 4.5;
    const lick = Math.sin(cycle);
    this.rig.overlay.forearm_L = [lick * 0.24 - 0.18, 0, -0.15];
    this.rig.overlay.fpaw_L = [lick * 0.3, 0, 0];
    this.rig.overlay.head = [Math.sin(cycle) * 0.14 + 0.1, 0.15, 0.12];
    this.rig.tongueOut = lick > 0.25 ? 0.65 : 0;
    this.b.needs.hygiene = Math.min(100, this.b.needs.hygiene + dt * 5.5);
    this.env.onCoatDirtyOrFluff?.(dt * 0.04);
    if (!this.sparkleDone && this.t > 2.2) {
      this.sparkleDone = true;
      this.env.emote('sparkle', this.cat.headWorld());
    }
    if (this.t > 4.2) this.finish();
  }
  stop() {
    delete this.rig.overlay.forearm_L;
    delete this.rig.overlay.fpaw_L;
    delete this.rig.overlay.head;
    this.rig.tongueOut = 0;
    this.rig.eyesClosed = 0;
    this.rig.setPose('sit', 5);
  }
}

class SleepAct extends CatAct {
  readonly name = 'sleep';
  priority = 1;
  private asleep = false;
  private zzzCooldown = 1.6;
  constructor(b: CatBrain, private readonly maxDur = 12) {
    super(b);
  }
  start() {
    const spot = Math.random() < 0.65 ? this.env.bedSpot : this.env.sunSpot;
    this.rig.setPose('stand', 6);
    this.cat.goTo(spot, {
      speed: 0.22,
      arrive: 0.14,
      onArrive: () => {
        this.asleep = true;
        this.t = 0;
        this.cat.stop();
        this.rig.setPose('sleep', 2.6);
        this.rig.eyesClosed = 1;
        this.rig.tailMode = 'idle';
        this.rig.wagAmp = 0.02;
      },
    });
  }
  step(dt: number) {
    if (!this.asleep) {
      if (this.t > 7) this.asleep = true;
      return;
    }
    this.b.needs.energy = Math.min(100, this.b.needs.energy + dt * 4.5);
    this.zzzCooldown -= dt;
    if (this.zzzCooldown <= 0) {
      this.zzzCooldown = 2.6;
      this.env.emote('zzz', this.cat.headWorld());
    }
    if (this.t > this.maxDur) this.finish();
  }
  stop() {
    this.rig.eyesClosed = 0;
    this.cat.stop();
    this.rig.setPose('lie', 4);
  }
}

class PlayToyAct extends CatAct {
  readonly name = 'play_toy';
  priority = 2;
  private phase: 'approach' | 'stalk' | 'chase' = 'approach';
  private batted = false;
  private stalkT = 0;
  constructor(b: CatBrain, private readonly toy: WorldToy) {
    super(b);
  }
  start() {
    this.rig.setPose('stand', 7);
    this.rig.earPerk = 0.85;
    this.rig.tailMode = 'wag_fast';
    const tp = this.toy.object.position;
    this.cat.goTo(tp, {
      speed: 0.42,
      arrive: 0.28,
      onArrive: () => {
        this.phase = 'stalk';
        this.stalkT = 0;
        this.cat.stop();
        this.rig.setPose('stalk', 8);
      },
    });
  }
  step(dt: number) {
    const tp = this.toy.object.position;
    this.rig.look = { point: tp, weight: 0.95 };
    if (this.phase === 'approach') {
      this.cat.goTo(tp, { speed: 0.42, arrive: 0.28, onArrive: () => { this.phase = 'stalk'; this.stalkT = 0; } });
      if (this.t > 5) this.finish();
      return;
    }
    if (this.phase === 'stalk') {
      this.stalkT += dt;
      this.cat.face(tp);
      // Cute feline pre-pounce butt wiggle!
      this.rig.overlay.pelvis = [0, Math.sin(this.stalkT * 22) * 0.14, 0];
      if (this.stalkT > 0.75) {
        delete this.rig.overlay.pelvis;
        this.phase = 'chase';
        this.rig.setPose('stand', 9);
        if (!this.batted) {
          this.batted = true;
          this.env.toyWorld.batImpulse(this.toy, this.cat.position, 1.8);
          this.env.emote('sparkle', tp);
          this.b.needs.fun = Math.min(100, this.b.needs.fun + 14);
          this.b.needs.stimulation = Math.min(100, this.b.needs.stimulation + 10);
          this.b.recordMemory('played');
        }
        const hopTarget = tp.clone().lerp(this.cat.position, 0.25);
        this.cat.jumpTo(hopTarget, 0.08, 0.34);
      }
      return;
    }
    if (!this.cat.jump) {
      if (this.t > 4.2) this.finish();
      else {
        this.cat.goTo(tp, { speed: 0.45, arrive: 0.22, onArrive: () => this.finish() });
      }
    }
  }
  stop() {
    delete this.rig.overlay.pelvis;
    this.cat.stop();
    this.rig.earPerk = 0.2;
    this.rig.setPose('stand', 6);
  }
}

class ChaseWandAct extends CatAct {
  readonly name = 'chase_wand';
  priority = 4;
  private pounceCd = 0;
  start() {
    this.rig.setPose('stalk', 8);
    this.rig.earPerk = 0.9;
    this.rig.tailMode = 'wag_fast';
    this.rig.wagAmp = 0.32;
  }
  step(dt: number) {
    if (!this.env.wandActive()) {
      this.finish();
      return;
    }
    this.pounceCd = Math.max(0, this.pounceCd - dt);
    const lure = this.env.wandLurePos();
    const speed = this.env.wandLureSpeed();
    this.rig.look = { point: lure, weight: 1.0 };
    this.cat.face(lure);

    const floorTarget = new THREE.Vector3(lure.x, 0, lure.z);
    const dist = this.cat.distanceTo(floorTarget);

    if (this.cat.jump) return;

    if (dist < 0.56 && (speed > 0.32 || Math.random() < dt * 0.8) && this.pounceCd <= 0 && lure.y < 0.52) {
      this.pounceCd = 1.35;
      const to = floorTarget.clone().lerp(this.cat.position, 0.22);
      const hopH = THREE.MathUtils.clamp(lure.y * 0.55, 0.08, 0.2);
      this.cat.jumpTo(to, hopH, 0.38, () => {
        this.env.impulseWand(new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.09, (Math.random() - 0.5) * 0.12));
        this.env.emote('heart', this.cat.headWorld());
        this.b.needs.fun = Math.min(100, this.b.needs.fun + 9);
        this.b.needs.stimulation = Math.min(100, this.b.needs.stimulation + 7);
        this.b.recordMemory('played');
      });
      return;
    }

    if (dist > 0.38) {
      this.rig.setPose(speed > 0.55 ? 'stand' : 'stalk', 7);
      this.cat.goTo(floorTarget, { speed: speed > 0.55 ? 0.5 : 0.3, arrive: 0.28 });
    } else {
      this.cat.stop();
      this.rig.setPose('stalk', 8);
      this.rig.overlay.pelvis = [0, Math.sin(this.b.time * 18) * 0.12, 0];
    }
  }
  stop() {
    delete this.rig.overlay.pelvis;
    this.cat.stop();
    this.rig.earPerk = 0.2;
    this.rig.setPose('sit', 6);
  }
}

class BoxPeekAct extends CatAct {
  readonly name = 'box_peek';
  priority = 2;
  private inside = false;
  start() {
    this.rig.setPose('stand', 6);
    this.rig.earPerk = 0.65;
    const centerInBox = this.env.boxSpot.clone().add(new THREE.Vector3(0, 0, -0.02));
    this.cat.goTo(centerInBox, {
      speed: 0.32,
      arrive: 0.1,
      onArrive: () => {
        this.inside = true;
        this.t = 0;
        this.cat.stop();
        this.cat.face(this.env.cameraPos());
        this.rig.setPose('box_peek', 6);
        this.env.wiggleBox();
        this.env.emote('sparkle', this.cat.headWorld());
        this.b.needs.stimulation = Math.min(100, this.b.needs.stimulation + 12);
        this.b.needs.safety = Math.min(100, this.b.needs.safety + 6);
        this.b.recordMemory('explored');
      },
    });
  }
  step() {
    if (!this.inside) {
      if (this.t > 6) this.finish();
      return;
    }
    this.b.lookAtCamera(0.95);
    this.rig.headTilt = Math.sin(this.t * 1.4) * 0.16;
    if (this.t > 5.2) this.finish();
  }
  stop() {
    this.rig.headTilt = 0;
    this.cat.stop();
    this.rig.setPose('stand', 5);
  }
}

class EatOrDrinkAct extends CatAct {
  readonly name: 'eat' | 'drink';
  priority = 3;
  private atBowl = false;
  private lastEmoteT = 0;
  constructor(b: CatBrain, private readonly water: boolean) {
    super(b);
    this.name = water ? 'drink' : 'eat';
  }
  private get bowl() {
    return this.water ? this.env.waterBowl : this.env.foodBowl;
  }
  start() {
    const bowlPos = this.bowl.pos;
    const approach = bowlPos.clone().add(new THREE.Vector3(-0.24, 0, 0.08));
    this.rig.setPose('stand', 6);
    this.rig.earPerk = 0.6;
    this.rig.tailMode = 'wag_slow';
    this.cat.goTo(approach, {
      speed: 0.34,
      arrive: 0.08,
      faceAfter: bowlPos,
      onArrive: () => {
        this.atBowl = true;
        this.t = 0;
        this.cat.stop();
        this.cat.face(bowlPos);
        this.rig.setPose('eat', 5);
      },
    });
  }
  step(dt: number) {
    if (!this.atBowl) {
      if (this.t > 7) this.finish();
      return;
    }
    this.cat.face(this.bowl.pos);
    this.rig.look = { point: this.bowl.pos, weight: 0.85 };
    const phase = Math.sin(this.t * (this.water ? 10 : 7));
    this.rig.overlay.head = [phase * 0.08, 0, 0];

    if (this.water) {
      this.rig.tongueOut = phase > 0 ? 0.75 : 0.15;
      this.bowl.consume(dt * 0.09);
      this.b.needs.thirst = Math.min(100, this.b.needs.thirst + dt * 14);
      if (this.t - this.lastEmoteT > 1.4) {
        this.lastEmoteT = this.t;
        this.bowl.triggerRipple?.();
        this.env.emote('drop', this.bowl.pos);
      }
    } else {
      this.rig.mouthOpen = phase > 0.1 ? 0.32 : 0;
      this.bowl.consume(dt * 0.11);
      this.b.needs.hunger = Math.min(100, this.b.needs.hunger + dt * 15);
      if (this.t - this.lastEmoteT > 1.5) {
        this.lastEmoteT = this.t;
        this.env.emote('heart', this.cat.headWorld());
      }
    }

    if (this.bowl.fill() <= 0.02 || this.t > 3.6) {
      this.b.recordMemory('fed');
      this.finish();
    }
  }
  stop() {
    delete this.rig.overlay.head;
    this.rig.mouthOpen = 0;
    this.rig.tongueOut = 0;
    this.cat.stop();
    this.rig.setPose('stand', 5);
  }
}

class ComeToPlayerAct extends CatAct {
  readonly name = 'come';
  priority = 3;
  private arrived = false;
  start() {
    const p = this.env.playerSpot();
    this.rig.setPose('stand', 7);
    this.rig.tailRaise = 0.85;
    this.rig.tailMode = 'wag_slow';
    this.rig.earPerk = 0.7;
    this.b.lookAtCamera(1);
    this.cat.goTo(p, {
      speed: 0.44,
      arrive: 0.14,
      faceAfter: this.env.cameraPos(),
      onArrive: () => {
        this.arrived = true;
        this.t = 0;
        this.cat.stop();
        this.rig.setPose('sit', 5);
        this.rig.happy = 0.8;
        this.env.emote('heart', this.cat.headWorld());
      },
    });
  }
  step() {
    this.b.lookAtCamera(1);
    if (!this.arrived && this.t > 5) this.arrived = true;
    if (this.arrived && this.t > 3.2) this.finish();
  }
  stop() {
    this.rig.happy = 0;
    this.cat.stop();
  }
}

class FollowHandAct extends CatAct {
  readonly name = 'follow_hand';
  priority = 3;
  step() {
    if (!this.b.hand) {
      this.finish();
      return;
    }
    const target = this.b.hand;
    this.rig.look = { point: target.clone().setY(0.18), weight: 0.95 };
    this.rig.earPerk = 0.65;
    this.rig.tailMode = 'wag_slow';
    if (this.cat.distanceTo(target) > 0.24) {
      this.rig.setPose('stand', 7);
      this.cat.goTo(target, { speed: 0.4, arrive: 0.18 });
    } else {
      this.cat.stop();
      this.cat.face(target);
      this.rig.setPose('sit', 5);
    }
  }
  stop() {
    this.cat.stop();
    this.rig.earPerk = 0.2;
  }
}

class PettedAct extends CatAct {
  readonly name = 'petted';
  priority = 5;
  private emoteCd = 0.45;
  start() {
    this.cat.stop();
    this.cat.face(this.env.cameraPos());
  }
  step(dt: number) {
    if (!this.b.pet || this.b.pet.idle > 0.95) {
      this.finish();
      return;
    }
    const reg = this.b.pet.region;
    const p = this.b.petPleasure;

    if (reg === 'belly' && this.b.affection >= 0.45) {
      this.rig.setPose('belly', 4);
      this.rig.tailMode = 'wag_slow';
    } else if (reg === 'back' || reg === 'rump') {
      this.rig.setPose('arch_purr', 5);
      this.rig.tailRaise = 0.9;
      this.rig.tailMode = 'wag_slow';
    } else {
      this.rig.setPose('sit', 5);
      this.rig.tailMode = 'wag_slow';
    }

    if (reg === 'chin') {
      this.rig.overlay.head = [-0.28, 0, 0.12];
    } else if (reg === 'head' || reg === 'ear') {
      this.rig.overlay.head = [0.12, 0, Math.sin(this.b.time * 4) * 0.14];
    } else {
      delete this.rig.overlay.head;
    }

    this.rig.happy = THREE.MathUtils.clamp(0.45 + p * 0.55, 0, 1);
    this.rig.eyesClosed = THREE.MathUtils.clamp(0.35 + p * 0.65, 0, 0.95);
    this.b.lookAtCamera(0.7);

    this.emoteCd -= dt;
    if (this.emoteCd <= 0 && this.b.pet.idle < 0.35) {
      this.emoteCd = 0.9;
      this.env.emote(p > 0.6 ? 'heart' : 'note', this.cat.headWorld());
    }
  }
  stop() {
    delete this.rig.overlay.head;
    this.rig.happy = 0;
    this.rig.eyesClosed = 0;
    this.rig.tailRaise = 0.25;
    this.rig.setPose('sit', 5);
  }
}

class BrushedAct extends CatAct {
  readonly name = 'brushed';
  priority = 5;
  private emoteCd = 0.4;
  start() {
    this.cat.stop();
    this.rig.setPose('stand', 5);
    this.rig.eyesClosed = 0.72;
    this.rig.happy = 0.75;
    this.rig.tailMode = 'wag_slow';
  }
  step(dt: number) {
    if (!this.b.brushActiveIdle && this.t > 1.2) {
      this.finish();
      return;
    }
    if (this.b.brushIdle > 1.2) {
      this.finish();
      return;
    }
    this.rig.eyesClosed = 0.85;
    this.rig.happy = 0.85;
    this.rig.overlay.head = [0.06, Math.sin(this.b.time * 2.2) * 0.18, 0.1];
    this.emoteCd -= dt;
    if (this.emoteCd <= 0) {
      this.emoteCd = 0.8;
      this.env.emote('sparkle', this.cat.headWorld());
    }
  }
  stop() {
    delete this.rig.overlay.head;
    this.rig.eyesClosed = 0;
    this.rig.happy = 0;
    this.rig.setPose('sit', 5);
  }
}

class RefuseAct extends CatAct {
  readonly name = 'refuse';
  priority = 6;
  constructor(b: CatBrain, private readonly reason: 'tired' | 'shy' | 'overstimulated') {
    super(b);
  }
  start() {
    this.cat.stop();
    this.rig.setPose('refuse', 7);
    this.rig.earPerk = -0.95; // Airplane ears!
    this.rig.tailMode = 'tuck';
    this.rig.happy = 0;
    this.rig.eyesClosed = 0;
    this.env.emote('question', this.cat.headWorld());
    this.env.onRefuse?.(this.reason);

    // Step slightly aside toward bedSpot to show personal space
    const stepAway = this.cat.position.clone().lerp(this.env.bedSpot, 0.35);
    this.cat.goTo(stepAway, { speed: 0.25, arrive: 0.08 });
  }
  step() {
    if (this.t > 2.6) this.finish();
  }
  stop() {
    this.rig.earPerk = 0.15;
    this.rig.tailMode = 'idle';
    this.cat.stop();
    this.rig.setPose('sit', 5);
  }
}

export interface PetStrokeInput {
  point: THREE.Vector3;
  region: CatRegion;
  speed: number;
  idle: number;
}

export class CatBrain {
  act: CatAct | null = null;
  time = 0;
  needs: Pet8Needs = createDefault8Needs();
  traits: PetPersonalityTraits = { ...PET_PERSONALITY_PRESETS[0]!.traits };
  memory: MemoryState = createMemoryState(PET_MEMORY_PERSIST_CAP);
  emotion: Pet9Emotion = 'happy';
  affection = 0.62;
  overstimulation = 0;
  coatFluff = 0.72;
  hand: THREE.Vector3 | null = null;
  pet: PetStrokeInput | null = null;
  petPleasure = 0;
  brushIdle = 99;
  brushActiveIdle = false;
  enabled = true;
  readonly activityHistory: CatActivityName[] = [];

  private bellyTapCount = 0;
  private lastBellyReset = 0;
  private recentActs: CatActivityName[] = [];
  private snapshot: PetSnapshot | null = null;

  constructor(
    readonly actor: CatActor,
    readonly env: CatBrainEnv,
  ) {}

  get activity(): CatActivityName {
    return this.act && !this.act.done ? this.act.name : 'idle';
  }

  applyPersonality(traitId?: string) {
    const preset = PET_PERSONALITY_PRESETS.find((p) => p.id === traitId);
    if (preset) {
      this.traits = { ...preset.traits };
    }
  }

  syncSnapshot(pet: PetSnapshot | null) {
    if (!pet) return;
    this.snapshot = pet;
    this.needs.hunger = Math.max(0, Math.min(100, pet.vitals.hunger));
    this.needs.fun = Math.max(0, Math.min(100, pet.vitals.fun));
    this.needs.energy = Math.max(0, Math.min(100, pet.vitals.energy));
    this.emotion = derive9Emotion(this.needs, this.traits);
  }

  recordMemory(kind: MemoryEventKind) {
    const atMs = Math.round(Date.now() + this.memory.events.length);
    this.memory = appendMemoryEvent(this.memory, {
      id: `${kind}@${atMs}`,
      kind,
      atMs,
      caregiverId: 'local-care',
    });
  }

  lookAtCamera(weight = 1) {
    this.actor.rig.look = { point: this.env.cameraPos(), weight };
  }

  startAct(next: CatAct, reasonVi?: string) {
    if (this.act && !this.act.done) this.act.stop();
    this.act = next;
    if (this.activityHistory[this.activityHistory.length - 1] !== next.name) {
      this.activityHistory.push(next.name);
      if (this.activityHistory.length > 40) this.activityHistory.shift();
    }
    this.recentActs.push(next.name);
    if (this.recentActs.length > 4) this.recentActs.shift();
    next.start();
    this.env.onActivityChange?.(next.name, reasonVi);
  }

  /** Called when the player taps "Gọi" to call Quýt. */
  callToPlayer() {
    this.overstimulation = Math.max(0, this.overstimulation - 0.15);
    if (this.needs.energy < 18) {
      this.startAct(new RefuseAct(this, 'tired'), 'Quýt đang mệt, muốn nằm nghỉ thêm');
      return;
    }
    if (this.traits.shy > 0.78 && this.affection < 0.38) {
      this.startAct(new RefuseAct(this, 'shy'), 'Quýt hơi nhút nhát lúc này');
      return;
    }
    this.startAct(new ComeToPlayerAct(this), 'Quýt chạy lại bên bạn');
  }

  observeMode() {
    this.env.emote('sparkle', this.actor.headWorld());
    if (this.act && (this.act.priority >= 3)) return;
    const roll = Math.random();
    if (roll < 0.35) this.startAct(new StretchAct(this), 'Quýt vươn vai dài');
    else if (roll < 0.7) this.startAct(new GroomAct(this), 'Quýt tự liếm lông rửa mặt');
    else this.startAct(new WanderAct(this), 'Quýt dạo quanh phòng');
  }

  setHand(p: THREE.Vector3 | null) {
    this.hand = p ? (this.hand || new THREE.Vector3()).copy(p) : null;
    if (p && this.act?.name !== 'follow_hand' && (this.act?.priority ?? 0) < 4) {
      this.startAct(new FollowHandAct(this), 'Quýt tò mò đi theo tay');
    }
  }

  setPet(p: PetStrokeInput | null) {
    this.pet = p;
    if (!p) return;

    // Track cat boundary on sensitive tail/belly touches
    if (p.region === 'tail' || (p.region === 'belly' && this.affection < 0.5)) {
      if (this.time - this.lastBellyReset > 4) this.bellyTapCount = 0;
      this.bellyTapCount += 1;
      this.lastBellyReset = this.time;
      this.overstimulation = Math.min(1, this.overstimulation + 0.032);
    }

    if (this.overstimulation > 0.85 || (this.bellyTapCount > 14 && this.affection < 0.45)) {
      this.overstimulation = 0.35;
      this.bellyTapCount = 0;
      this.startAct(new RefuseAct(this, 'overstimulated'), 'Quýt không muốn bị chạm thêm');
      return;
    }

    if (!(this.act instanceof PettedAct) && (this.act?.priority ?? 0) < 6) {
      this.startAct(new PettedAct(this), 'Quýt rừ rừ hưởng ứng cái vuốt ve');
    }
  }

  brushStroke(amount = 0.05) {
    this.brushIdle = 0;
    this.brushActiveIdle = true;
    this.coatFluff = THREE.MathUtils.clamp(this.coatFluff + amount, 0.45, 0.96);
    this.actor.model.uniforms.uFluff.value = this.coatFluff;
    this.actor.model.uniforms.uDirt.value = Math.max(0, this.actor.model.uniforms.uDirt.value - amount);
    this.needs.hygiene = Math.min(100, this.needs.hygiene + amount * 60);
    this.needs.social = Math.min(100, this.needs.social + amount * 25);
    if (!(this.act instanceof BrushedAct) && (this.act?.priority ?? 0) < 6) {
      this.startAct(new BrushedAct(this), 'Quýt lim dim khi được chải lông');
    }
  }

  noticeFood() {
    if ((this.act?.priority ?? 0) <= 3) {
      this.env.emote('sparkle', this.env.foodBowl.pos);
      this.startAct(new EatOrDrinkAct(this, false), 'Quýt chạy tới bát ăn hạt');
    }
  }

  noticeWater() {
    if ((this.act?.priority ?? 0) <= 3) {
      this.env.emote('drop', this.env.waterBowl.pos);
      this.startAct(new EatOrDrinkAct(this, true), 'Quýt chạy tới bát uống nước');
    }
  }

  noticeToy(toy: WorldToy) {
    if (this.needs.energy < 14) {
      this.startAct(new RefuseAct(this, 'tired'), 'Quýt hơi buồn ngủ, chưa muốn đuổi đồ chơi');
      return;
    }
    if ((this.act?.priority ?? 0) < 5) {
      this.startAct(new PlayToyAct(this, toy), 'Quýt rình và vồ đồ chơi');
    }
  }

  noticeWand() {
    if (this.act instanceof ChaseWandAct) return;
    if ((this.act?.priority ?? 0) < 5) {
      this.startAct(new ChaseWandAct(this), 'Quýt dõi theo cần câu mèo');
    }
  }

  inspectBox() {
    if (this.env.boxPlaced() && (this.act?.priority ?? 0) < 5) {
      this.startAct(new BoxPeekAct(this), 'Quýt nhảy vào hộp giấy ngó ra');
    }
  }

  update(dt: number) {
    this.time += dt;
    this.brushIdle += dt;
    if (this.brushIdle > 0.6) this.brushActiveIdle = false;

    if (this.act && this.act.done) {
      this.act.stop();
      this.act = null;
    }

    if (this.env.wandActive() && !(this.act instanceof ChaseWandAct) && (this.act?.priority ?? 0) < 4) {
      this.startAct(new ChaseWandAct(this), 'Quýt rình cần câu lông vũ');
    }

    if (this.act) {
      this.act.t += dt;
      this.act.step(dt);
    } else if (this.enabled) {
      this.chooseAutonomousAct();
    }

    // Petting pleasure & OLW affection/mood integration
    if (this.pet && this.pet.idle < 0.35) {
      const bonus = this.pet.region === 'chin' || this.pet.region === 'head' ? 1.25 : 0.9;
      this.petPleasure = Math.min(1, this.petPleasure + dt * Math.min(1.6, this.pet.speed * 2.2) * bonus);
      this.affection = THREE.MathUtils.clamp(this.affection + dt * 0.03 * bonus, 0, 1);
      this.needs.social = Math.min(100, this.needs.social + dt * 7 * bonus);
      this.needs.fun = Math.min(100, this.needs.fun + dt * 5 * bonus);
      if (this.pet.region !== 'tail') {
        this.overstimulation = Math.max(0, this.overstimulation - dt * 0.05);
      }
    } else {
      this.petPleasure = Math.max(0, this.petPleasure - dt * 0.45);
      this.overstimulation = Math.max(0, this.overstimulation - dt * 0.08);
    }

    // Gentle passive need drift
    const moving = this.actor.speed > 0.05;
    this.needs.energy = Math.max(10, this.needs.energy - dt * (moving ? 0.35 : 0.04));
    this.needs.hunger = Math.max(15, this.needs.hunger - dt * 0.14);
    this.needs.thirst = Math.max(15, this.needs.thirst - dt * 0.16);
    this.emotion = derive9Emotion(this.needs, this.traits);

    // Subtle mood-driven tail wag
    const rig = this.actor.rig;
    const happy01 = this.needs.fun / 100;
    if (!(this.act instanceof SleepAct)) {
      const targetWag = 0.1 + happy01 * 0.22 + this.petPleasure * 0.28;
      rig.wagAmp += (targetWag - rig.wagAmp) * Math.min(1, dt * 3);
      rig.wagFreq = 1.6 + this.petPleasure * 2.6 + (this.act instanceof ChaseWandAct ? 2.4 : 0);
    }
    void this.snapshot;
  }

  private chooseAutonomousAct() {
    // Bridge to OLW utility scoring + anti-repeat variety
    const bowlFoodPortions = Math.round(this.env.foodBowl.fill() * 4);
    const waterBowlVolume = Math.round(this.env.waterBowl.fill() * 100);
    const decisionCtx = {
      needs: this.needs,
      traits: this.traits,
      emotion: this.emotion,
      bowlFoodPortions,
      waterBowlVolume,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: Date.now(),
    };

    if (waterBowlVolume > 8 && this.needs.thirst < 78 && !this.wasRecent('drink')) {
      const drinkScore = scoreAffordanceAction(
        {
          id: 'water_bowl',
          targetId: 'water_bowl',
          action: 'drink_bowl',
          available: true,
          reachable: true,
          distance: 80,
          occupied: false,
          cooldownUntilMs: 0,
          estimatedCostMs: 2500,
          x: 0,
          y: 0,
        },
        decisionCtx,
      );
      if (drinkScore.score01 > 0.28) {
        this.startAct(new EatOrDrinkAct(this, true), 'Quýt khát nên tự đi uống nước');
        return;
      }
    }

    if (bowlFoodPortions > 0 && this.needs.hunger < 80 && !this.wasRecent('eat')) {
      const eatScore = scoreAffordanceAction(
        {
          id: 'food_bowl',
          targetId: 'food_bowl',
          action: 'eat_bowl',
          available: true,
          reachable: true,
          distance: 80,
          occupied: false,
          cooldownUntilMs: 0,
          estimatedCostMs: 2500,
          x: 0,
          y: 0,
        },
        decisionCtx,
      );
      if (eatScore.score01 > 0.28) {
        this.startAct(new EatOrDrinkAct(this, false), 'Quýt đói nên tự đi ăn hạt');
        return;
      }
    }

    if (this.needs.energy < 24 && !this.wasRecent('sleep')) {
      this.startAct(new SleepAct(this, 10), 'Quýt tìm đệm ấm để ngủ');
      return;
    }

    const toys = this.env.toyWorld.list.filter((t) => !t.inHand && t.resting);
    const candidates: Array<[number, CatActivityName, () => CatAct, string]> = [
      [2.6, 'wander', () => new WanderAct(this), 'Quýt dạo bước quanh phòng khách'],
      [1.7, 'sniff', () => new SniffAct(this), 'Quýt đánh hơi khám phá sàn gỗ'],
      [2.1, 'sit', () => new IdleStandOrSitAct(this, 2.2 + Math.random() * 1.6, 'sit', true), 'Quýt ngồi nhìn bạn và chớp mắt chậm'],
      [1.8, 'loaf', () => new IdleStandOrSitAct(this, 2.6 + Math.random() * 1.8, 'lie', true), 'Quýt cuộn bánh mì nghỉ trên thảm'],
      [1.4, 'stretch', () => new StretchAct(this), 'Quýt vươn vai sảng khoái'],
      [1.6, 'groom', () => new GroomAct(this), 'Quýt liếm chân rửa mặt'],
      [1.1 + this.traits.lazy * 1.4, 'sleep', () => new SleepAct(this, 5.2), 'Quýt chợp mắt dưới nắng ấm'],
    ];

    if (toys.length > 0) {
      candidates.push([
        1.5 + this.traits.playful * 1.6,
        'play_toy',
        () => new PlayToyAct(this, toys[Math.floor(Math.random() * toys.length)]!),
        'Quýt tự tới vồ đồ chơi',
      ]);
    }
    if (this.env.boxPlaced()) {
      candidates.push([
        1.1 + this.traits.curious * 1.3,
        'box_peek',
        () => new BoxPeekAct(this),
        'Quýt chui vào hộp giấy ngắm nghía',
      ]);
    }

    // Strongly penalize immediate repeats so Quýt constantly exhibits varied behavior
    let totalWeight = 0;
    const weighted = candidates.map(([w, actName, factory, reason]) => {
      const repeatPenalty = this.wasRecent(actName) ? 0.14 : 1.0;
      const finalW = w * repeatPenalty;
      totalWeight += finalW;
      return { finalW, factory, reason };
    });

    let pick = Math.random() * totalWeight;
    for (const item of weighted) {
      pick -= item.finalW;
      if (pick <= 0) {
        this.startAct(item.factory(), item.reason);
        return;
      }
    }
    this.startAct(new WanderAct(this), 'Quýt đi dạo quanh phòng');
  }

  private wasRecent(act: CatActivityName): boolean {
    const last2 = this.recentActs.slice(-2);
    return last2.includes(act);
  }
}
