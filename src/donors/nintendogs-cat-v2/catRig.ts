// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/dog/rig.ts + j4lpan/pet-shop blink/ear micro-expressions
import * as THREE from 'three';
import type { PetCareTailMode } from '../../shared/petLiving/petCare/petCareTypes';
import type { CatModel } from './catModel';

type LegPose = [number, number, number, number];

export interface PoseDef {
  body?: [number, number, number];
  pelvis?: [number, number, number];
  chest?: [number, number, number];
  neck?: number;
  neckYaw?: number;
  head?: [number, number, number];
  jaw?: number;
  tail?: [number, number];
  fl?: LegPose;
  fr?: LegPose;
  hl?: LegPose;
  hr?: LegPose;
  splay?: [number, number];
  solve?: [string[], string[]];
  ears?: number;
}

const SIT_FRONT: LegPose = [0.08, -0.02, -0.18, 0];
const SIT_HIND: LegPose = [-1.45, 0.55, -1.52, 0];

export const CAT_POSES: Record<string, PoseDef> = {
  stand: {
    tail: [0.2, 0.25],
  },
  sit: {
    pelvis: [-0.48, 0, 0], chest: [0.08, 0, 0], neck: -0.42, head: [0.04, 0, 0], tail: [-0.7, 0.6],
    fl: SIT_FRONT, fr: SIT_FRONT, hl: SIT_HIND, hr: SIT_HIND, splay: [0, 0.16],
    solve: [['fpaw'], ['butt', 'hock']],
  },
  lie: {
    // Cozy cat loaf / sphinx pose
    pelvis: [-0.04, 0, 0], neck: -0.22, head: [0.1, 0, 0], tail: [-0.35, 0.55],
    fl: [0.95, -1.52, -1.56, 0.05], fr: [0.95, -1.52, -1.56, 0.05],
    hl: [-1.25, 1.45, -1.52, 0.05], hr: [-1.25, 1.45, -1.52, 0.05], splay: [0.05, 0.3],
    solve: [['elbow', 'wrist'], ['hock', 'knee', 'belly']],
  },
  sleep: {
    body: [0, 0, 1.38], pelvis: [0.14, 0.22, 0], chest: [0, -0.25, 0], neck: 0.28, neckYaw: -0.45, head: [0.38, -0.45, 0.5], tail: [-0.35, 0.8],
    fl: [-0.32, 0.32, 0.42, 0.4], fr: [-0.2, 0.52, 0.5, 0.5], hl: [-0.95, 1.12, 0.22, 0.3], hr: [-0.72, 1.22, 0.32, 0.3],
    ears: -0.25,
  },
  belly: {
    body: [0, 0, Math.PI], pelvis: [0, 0, 0.12], neck: 0.22, head: [0.28, 0.32, -0.35], tail: [0.15, 0.3],
    fl: [-0.5, 0.9, 1.3, 1.0], fr: [-0.4, 1.0, 1.4, 1.0], hl: [-1.0, 1.1, -0.2, 0.2], hr: [-0.9, 1.2, -0.1, 0.2],
    splay: [0.25, 0.55], ears: -0.15,
  },
  stretch: {
    // Classic feline morning bow stretch
    pelvis: [0.16, 0, 0], chest: [-0.08, 0, 0], neck: -0.52, head: [0.08, 0, 0], tail: [0.95, 0.35], ears: 0.4,
    fl: [0.85, -1.5, -1.56, 0.05], fr: [0.85, -1.5, -1.56, 0.05],
    solve: [['elbow', 'wrist'], ['hpaw']],
  },
  groom: {
    // Sitting upright with front paw raised near mouth to lick & wash face
    pelvis: [-0.48, 0, 0], chest: [0.08, 0, 0], neck: -0.1, head: [0.42, 0.22, 0.18], tail: [-0.65, 0.65],
    fl: [-1.35, -1.55, -1.25, -0.45], fr: SIT_FRONT, hl: SIT_HIND, hr: SIT_HIND, splay: [0, 0.16],
    solve: [['fpaw'], ['butt', 'hock']],
  },
  stalk: {
    // Low crouched cat stalk with ears forward before pounce
    pelvis: [0.08, 0, 0], chest: [0.1, 0, 0], neck: 0.12, head: [0.02, 0, 0], tail: [-0.2, 0.25], ears: 0.8,
    fl: [0.68, -1.05, -0.82, 0.04], fr: [0.68, -1.05, -0.82, 0.04],
    hl: [-0.82, 1.05, -0.95, 0.04], hr: [-0.82, 1.05, -0.95, 0.04],
    solve: [['fpaw'], ['hpaw']],
  },
  jump: {
    body: [-0.25, 0, 0], neck: -0.25, head: [0.08, 0, 0], tail: [0.45, 0.2],
    fl: [-0.95, 0.55, 0.9, 0.6], fr: [-0.95, 0.55, 0.9, 0.6], hl: [0.4, 1.2, 0.2, 0.3], hr: [0.4, 1.2, 0.2, 0.3],
  },
  eat: {
    chest: [0.14, 0, 0], neck: 0.92, head: [0.86, 0, 0], tail: [0.22, 0.2],
    fl: [0.05, -0.05, -0.1, 0], fr: [0.05, -0.05, -0.1, 0],
  },
  sniff: {
    chest: [0.08, 0, 0], neck: 0.78, head: [0.7, 0, 0], tail: [0.28, 0.2],
  },
  arch_purr: {
    pelvis: [-0.1, 0, 0], chest: [-0.08, 0, 0], neck: -0.35, head: [-0.15, 0, 0.15], tail: [0.95, 0.35],
    ears: 0.35,
  },
  box_peek: {
    pelvis: [-0.45, 0, 0], chest: [0.05, 0, 0], neck: -0.5, head: [0.05, 0, 0.12], tail: [-0.5, 0.4],
    fl: [0.45, -1.05, -1.1, 0], fr: [0.45, -1.05, -1.1, 0], hl: SIT_HIND, hr: SIT_HIND,
    solve: [['fpaw'], ['butt', 'hock']],
  },
  refuse: {
    pelvis: [-0.46, 0, 0], chest: [0.12, 0, 0], neck: -0.2, head: [0.15, -0.35, -0.1], tail: [-0.85, 0.2],
    fl: SIT_FRONT, fr: SIT_FRONT, hl: SIT_HIND, hr: SIT_HIND, splay: [0, 0.16],
    solve: [['fpaw'], ['butt', 'hock']],
    ears: -1,
  },
};

const LEGS = {
  fl: ['upperarm_L', 'forearm_L', 'wrist_L', 'fpaw_L'],
  fr: ['upperarm_R', 'forearm_R', 'wrist_R', 'fpaw_R'],
  hl: ['thigh_L', 'shin_L', 'meta_L', 'hpaw_L'],
  hr: ['thigh_R', 'shin_R', 'meta_R', 'hpaw_R'],
} as const;
type LegKey = keyof typeof LEGS;

export type Gait = 'walk' | 'trot' | 'gallop';

const GAIT: Record<Gait, { freq: number; duty: number; phase: Record<LegKey, number> }> = {
  walk: { freq: 2.0, duty: 0.62, phase: { hl: 0, fl: 0.25, hr: 0.5, fr: 0.75 } },
  trot: { freq: 2.7, duty: 0.5, phase: { fl: 0, hr: 0.02, fr: 0.5, hl: 0.52 } },
  gallop: { freq: 3.4, duty: 0.38, phase: { hl: 0, hr: 0.1, fl: 0.48, fr: 0.58 } },
};

export interface LookTarget {
  point: THREE.Vector3 | null;
  weight: number;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

function smoothTo(cur: number, target: number, rate: number, dt: number) {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

export class CatRig {
  readonly names: string[];
  readonly index: Record<string, number> = {};
  readonly cur: Float32Array;
  readonly target: Float32Array;
  private readonly out: Float32Array;
  readonly compiled: Record<string, Float32Array> = {};
  private readonly restDir: Record<string, number> = {};

  pose = 'stand';
  poseRate = 7;

  speed = 0;
  private phase = 0;
  gait: Gait = 'walk';
  private gaitBlend = { walk: 1, trot: 0, gallop: 0 };
  turnRate = 0;
  private bendSmooth = 0;
  moveWeight = 0;

  // Feline expressions
  tailMode: PetCareTailMode = 'idle';
  wagAmp = 0.22;
  wagFreq = 1.6;
  private wagPhase = 0;
  tailRaise = 0.15;
  happy = 0;
  mouthOpen = 0;
  private jawCur = 0;
  jawHold = 0;
  tongueOut = 0;
  private tongueCur = 0;
  eyesClosed = 0;
  private lidCur = 0;
  private blinkT = 2.4;
  private blinkAmt = 0;
  private doubleBlinkPending = false;
  earPerk = 0; // -1 airplane ears, 0 neutral, 1 perked forward
  headTilt = 0;
  private headTiltCur = 0;
  look: LookTarget = { point: null, weight: 0 };
  private lookYaw = 0;
  private lookPitch = 0;
  private eyeYaw = 0;
  private eyePitch = 0;
  overlay: Record<string, [number, number, number]> = {};
  rootLift = 0;
  rootRoll = 0;
  breathe = 0;
  groundSnap = true;
  private groundY = 0;
  private earAng = [0, 0];
  time = 0;

  constructor(readonly model: CatModel) {
    this.names = model.design.bones.map((b) => b.name);
    this.names.forEach((n, i) => (this.index[n] = i));
    const n = this.names.length * 3;
    this.cur = new Float32Array(n);
    this.target = new Float32Array(n);
    this.out = new Float32Array(n);
    for (const leg of Object.values(LEGS)) {
      for (let i = 0; i < 3; i++) {
        const bA = leg[i]!;
        const bB = leg[i + 1]!;
        const a = model.boneWorldRest(bA);
        const b = model.boneWorldRest(bB);
        this.restDir[bA] = Math.atan2(-(b.z - a.z), -(b.y - a.y));
      }
    }
    for (const name of Object.keys(CAT_POSES)) this.compiled[name] = this.compile(CAT_POSES[name]!);
    this.target.set(this.compiled.stand!);
    this.cur.set(this.compiled.stand!);
  }

  private set(arr: Float32Array, bone: string, x: number, y = 0, z = 0) {
    const i = this.index[bone]! * 3;
    arr[i] = x; arr[i + 1] = y; arr[i + 2] = z;
  }

  compile(def: PoseDef, bodyPitch?: number): Float32Array {
    const arr = new Float32Array(this.names.length * 3);
    const body = def.body || [0, 0, 0];
    const bx = bodyPitch ?? body[0];
    this.set(arr, 'body', bx, body[1], body[2]);
    const pel = def.pelvis || [0, 0, 0];
    const ch = def.chest || [0, 0, 0];
    this.set(arr, 'pelvis', pel[0], pel[1], pel[2]);
    this.set(arr, 'chest', ch[0], ch[1], ch[2]);
    const frontBase = bx + ch[0];
    const hindBase = bx + pel[0];
    const neckAbs = def.neck ?? 0;
    this.set(arr, 'neck', neckAbs - frontBase, def.neckYaw ?? 0, 0);
    const head = def.head || [0, 0, 0];
    this.set(arr, 'head', head[0] - neckAbs, head[1], head[2]);
    this.set(arr, 'jaw', def.jaw ?? 0);
    const tail = def.tail || [0, 0];
    this.set(arr, 'tail0', -tail[0]);
    for (let i = 1; i < 5; i++) this.set(arr, 'tail' + i, -tail[1] / 4);
    const splay = def.splay || [0, 0];
    for (const key of Object.keys(LEGS) as LegKey[]) {
      const bones = LEGS[key];
      const pose = def[key];
      const side = key.endsWith('l') ? 1 : -1;
      const base = key[0] === 'f' ? frontBase : hindBase;
      const sp = (key[0] === 'f' ? splay[0] : splay[1]) * side;
      if (!pose) {
        let parentAbs = base;
        for (let i = 0; i < 4; i++) {
          this.set(arr, bones[i]!, 0 - parentAbs, 0, i === 0 ? -sp : i === 1 ? sp * 0.6 : 0);
          parentAbs = 0;
        }
        continue;
      }
      let parentAbs = base;
      for (let i = 0; i < 3; i++) {
        const bName = bones[i]!;
        const abs = pose[i]! - this.restDir[bName]!;
        this.set(arr, bName, abs - parentAbs, 0, i === 0 ? -sp : i === 1 ? sp * 0.6 : 0);
        parentAbs = abs;
      }
      this.set(arr, bones[3], pose[3] - parentAbs);
    }
    this.set(arr, 'ear_L', 0, 0, 0);
    this.set(arr, 'ear_R', 0, 0, 0);
    return arr;
  }

  solvePoses() {
    for (const [name, def] of Object.entries(CAT_POSES)) {
      if (!def.solve) continue;
      let lo = -1.5, hi = 0.9;
      const f = (bx: number) => {
        const arr = this.compile(def, bx);
        this.applyAngles(arr);
        this.model.bones.root!.position.set(0, 0, 0);
        this.model.bones.root!.quaternion.identity();
        const a = this.model.lowestContact(def.solve![0]);
        const b = this.model.lowestContact(def.solve![1]);
        return a - b;
      };
      const flo = f(lo), fhi = f(hi);
      if (Math.sign(flo) === Math.sign(fhi)) {
        this.compiled[name] = this.compile(def, Math.abs(flo) < Math.abs(fhi) ? lo : hi);
        continue;
      }
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (Math.sign(fm) === Math.sign(flo)) lo = mid;
        else hi = mid;
      }
      this.compiled[name] = this.compile(def, (lo + hi) / 2);
    }
    this.applyAngles(this.cur);
  }

  private applyAngles(arr: Float32Array) {
    const bones = this.model.bones;
    for (let i = 0; i < this.names.length; i++) {
      const n = this.names[i]!;
      const b = bones[n]!;
      if (n === 'root') continue;
      _e.set(arr[i * 3]!, arr[i * 3 + 1]!, arr[i * 3 + 2]!, 'YXZ');
      b.quaternion.setFromEuler(_e);
    }
  }

  setPose(name: string, rate = 7) {
    const targetPose = this.compiled[name];
    if (!targetPose) return;
    this.pose = name;
    this.poseRate = rate;
    this.target.set(targetPose);
  }

  update(dt: number) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const n = this.cur.length;
    const k = 1 - Math.exp(-this.poseRate * dt);
    for (let i = 0; i < n; i++) this.cur[i] = this.cur[i]! + (this.target[i]! - this.cur[i]!) * k;
    this.out.set(this.cur);

    this.locomotion(dt);
    this.tailLayer(dt);
    this.headLayer(dt);
    this.faceLayer(dt);

    for (const [bone, a] of Object.entries(this.overlay)) {
      const i = this.index[bone];
      if (i === undefined) continue;
      this.out[i * 3] = this.out[i * 3]! + a[0];
      this.out[i * 3 + 1] = this.out[i * 3 + 1]! + a[1];
      this.out[i * 3 + 2] = this.out[i * 3 + 2]! + a[2];
    }

    // Gentle feline breathing
    this.breathe += dt * (this.pose === 'sleep' ? 0.9 : 1.5);
    const br = Math.sin(this.breathe) * (this.pose === 'sleep' ? 0.022 : 0.012);
    const chestIdx = this.index.chest! * 3;
    this.out[chestIdx] = this.out[chestIdx]! + br * 0.35;

    const root = this.model.bones.root!;
    const H = this.model.design.dims.H;
    const bob = -H * 0.01 * Math.min(1, this.speed / H) * 0.5 * (1 - Math.cos(this.phase * Math.PI * 4));
    const w = this.moveWeight;
    if (w > 0.001) {
      this.applyAngles(this.out);
      root.position.set(0, bob, 0);
      root.quaternion.identity();
      this.model.root.updateMatrixWorld(true);
      this.legIK();
    }
    this.applyAngles(this.out);
    this.earLayer(dt);

    root.position.set(0, 0, 0);
    root.quaternion.setFromAxisAngle(_v.set(0, 0, 1), this.rootRoll);
    if (this.rootRoll !== 0) {
      const c = this.model.restPos.body!;
      _v2.set(0, c.y, 0).applyQuaternion(root.quaternion);
      root.position.set(-_v2.x, c.y - _v2.y, 0);
    }
    const low = this.model.lowestContact();
    const gy = -low;
    const target = gy + (bob - gy) * w;
    this.groundY = this.groundSnap ? target : smoothTo(this.groundY, target, 12, dt);
    root.position.y += this.groundY + this.rootLift;
  }

  private locomotion(dt: number) {
    const turning = Math.abs(this.turnRate) > 0.35;
    const target = this.speed > 0.02 || turning ? 1 : 0;
    this.moveWeight = smoothTo(this.moveWeight, target, 8, dt);
    const H = this.model.design.dims.H;
    const rel = this.speed / H;
    const want: Gait = rel < 1.35 ? 'walk' : rel < 3.6 ? 'trot' : 'gallop';
    this.gait = want;
    for (const g of ['walk', 'trot', 'gallop'] as Gait[]) {
      this.gaitBlend[g] = smoothTo(this.gaitBlend[g], g === want ? 1 : 0, 6, dt);
    }
    const w = this.moveWeight;
    let freq = 0, duty = 0;
    for (const g of ['walk', 'trot', 'gallop'] as Gait[]) {
      freq += GAIT[g].freq * this.gaitBlend[g];
      duty += GAIT[g].duty * this.gaitBlend[g];
    }
    freq *= Math.pow(0.28 / Math.max(0.12, H), 0.42);
    const reach = this.maxStance();
    const turnTravel = Math.abs(this.turnRate) * this.model.design.dims.BL * 0.5;
    freq = Math.max(freq, ((this.speed + turnTravel) * duty) / reach);
    this.stepFreq = smoothTo(this.stepFreq || freq, freq, 6, dt);
    this.phase = (this.phase + dt * this.stepFreq * Math.max(0.35, w)) % 1;
    this.bendSmooth = smoothTo(this.bendSmooth, THREE.MathUtils.clamp(this.turnRate * 0.18, -0.35, 0.35), 6, dt);
    if (w < 0.01 && Math.abs(this.bendSmooth) < 0.001) return;

    const o = this.out;
    const gal = this.gaitBlend.gallop;
    const ph2 = this.phase * Math.PI * 2;
    const pelI = this.index.pelvis! * 3;
    const cheI = this.index.chest! * 3;
    const bodI = this.index.body! * 3;
    const hedI = this.index.head! * 3;
    const nckI = this.index.neck! * 3;
    o[pelI] = o[pelI]! + Math.sin(ph2) * 0.12 * gal * w;
    o[cheI] = o[cheI]! - Math.sin(ph2) * 0.1 * gal * w;
    o[bodI] = o[bodI]! + Math.sin(ph2 + 0.8) * 0.06 * gal * w;
    const trot = this.gaitBlend.trot + this.gaitBlend.walk * 0.6;
    o[bodI + 2] = o[bodI + 2]! + Math.sin(ph2) * 0.025 * trot * w;
    o[hedI] = o[hedI]! + Math.sin(ph2 * 2) * 0.02 * w;
    o[cheI + 1] = o[cheI + 1]! + this.bendSmooth;
    o[pelI + 1] = o[pelI + 1]! - this.bendSmooth * 0.8;
    o[nckI + 1] = o[nckI + 1]! + this.bendSmooth * 0.6;
  }

  private stepFreq = 0;
  private legInfo: Record<LegKey, { L1: number; L2: number; L3: number; foot: THREE.Vector3; front: boolean; side: number }> | null = null;

  private legs() {
    if (this.legInfo) return this.legInfo;
    const m = this.model;
    const info = {} as NonNullable<CatRig['legInfo']>;
    for (const key of Object.keys(LEGS) as LegKey[]) {
      const b = LEGS[key];
      const p = b.map((n) => m.boneWorldRest(n));
      info[key] = {
        L1: p[0]!.distanceTo(p[1]!), L2: p[1]!.distanceTo(p[2]!), L3: p[2]!.distanceTo(p[3]!),
        foot: p[3]!.clone(), front: key[0] === 'f', side: key.endsWith('l') ? 1 : -1,
      };
    }
    this.legInfo = info;
    return info;
  }

  private maxStance() {
    const L = this.legs();
    const legLen = Math.min(L.fl.L1 + L.fl.L2, L.hl.L1 + L.hl.L2);
    return Math.max(0.03, legLen * 0.95);
  }

  private legIK() {
    const w = this.moveWeight;
    if (w < 0.001) return;
    const m = this.model;
    const L = this.legs();
    const o = this.out;
    const idx = this.index;
    const zc = (m.design.dims.shZ + m.design.dims.hipZ) / 2;
    const freq = Math.max(0.3, this.stepFreq);
    const wTurn = this.turnRate;
    const bodyX = o[idx.body! * 3]!;
    for (const key of Object.keys(LEGS) as LegKey[]) {
      const leg = L[key];
      const b = LEGS[key];
      let fx = 0, fz = 0, lift = 0, gwSum = 0;
      for (const g of ['walk', 'trot', 'gallop'] as Gait[]) {
        const gw = this.gaitBlend[g];
        if (gw < 0.01) continue;
        const G = GAIT[g];
        const ts = G.duty / freq;
        const rx = leg.foot.x, rz = leg.foot.z - zc;
        const dx = -(wTurn * rz) * ts;
        const dz = -(this.speed - wTurn * rx) * ts;
        const ph = (this.phase + G.phase[key]) % 1;
        let u: number, l: number;
        if (ph < G.duty) {
          u = ph / G.duty - 0.5;
          l = 0;
        } else {
          const t = (ph - G.duty) / (1 - G.duty);
          const e = t * t * (3 - 2 * t);
          u = 0.5 - e;
          l = Math.sin(Math.PI * t);
        }
        fx += gw * dx * u;
        fz += gw * dz * u;
        const travel = Math.hypot(dx, dz);
        lift += gw * l * Math.min(0.32 * (leg.L1 + leg.L2), 0.012 + travel * (g === 'gallop' ? 0.45 : 0.32));
        gwSum += gw;
      }
      if (gwSum > 0) { fx /= gwSum; fz /= gwSum; lift /= gwSum; }
      const swing = Math.min(1, lift / Math.max(1e-4, 0.25 * (leg.L1 + leg.L2)));

      m.bones[b[0]]!.getWorldPosition(_v);
      m.root.worldToLocal(_v);
      const sy = _v.y, sz = _v.z;
      const th3 = this.restDir[b[2]]! + swing * (leg.front ? 1.1 : 0.45);
      const ty3 = leg.foot.y + lift, tz3 = leg.foot.z + fz;
      const ty2 = ty3 + Math.cos(th3) * leg.L3, tz2 = tz3 + Math.sin(th3) * leg.L3;
      let dy = ty2 - sy, dz = tz2 - sz;
      let d = Math.hypot(dy, dz);
      const dMax = (leg.L1 + leg.L2) * 0.999, dMin = Math.abs(leg.L1 - leg.L2) * 1.01 + 1e-4;
      if (d > dMax) { dy *= dMax / d; dz *= dMax / d; d = dMax; }
      if (d < dMin) d = dMin;
      const phi = Math.atan2(-dz, -dy);
      const cosA = THREE.MathUtils.clamp((leg.L1 * leg.L1 + d * d - leg.L2 * leg.L2) / (2 * leg.L1 * d), -1, 1);
      const alpha = Math.acos(cosA);
      const th1 = leg.front ? phi + alpha : phi - alpha;
      const ey = sy - Math.cos(th1) * leg.L1, ez = sz - Math.sin(th1) * leg.L1;
      const th2 = Math.atan2(-(sz + dz - ez), -(sy + dy - ey));
      const pawPitch = swing * (leg.front ? 1.2 : 0.8);

      const parentAbs = bodyX + o[(leg.front ? idx.chest! : idx.pelvis!) * 3]!;
      const a0 = th1 - this.restDir[b[0]]!;
      const a1 = th2 - this.restDir[b[1]]!;
      const a2 = th3 - this.restDir[b[2]]!;
      const locals = [a0 - parentAbs, a1 - a0, a2 - a1, pawPitch - a2];
      for (let i = 0; i < 4; i++) {
        const j = idx[b[i]!]! * 3;
        o[j] = o[j]! + (locals[i]! - o[j]!) * w;
      }
      const legLen = leg.L1 + leg.L2 + leg.L3;
      const j0 = idx[b[0]]! * 3 + 2;
      o[j0] = o[j0]! + Math.asin(THREE.MathUtils.clamp(fx / legLen, -0.5, 0.5)) * w;
    }
  }

  private tailLayer(dt: number) {
    this.wagPhase += dt * this.wagFreq * Math.PI * 2;
    const o = this.out;
    const puff = this.tailMode === 'puff' ? 0.55 : this.tailMode === 'tuck' ? -0.45 : 0;
    for (let i = 0; i < 5; i++) {
      const lag = i * 0.52;
      const tipBias = i >= 3 && this.tailMode === 'wag_fast' ? 1.35 : 0.4;
      const ti = this.index['tail' + i]! * 3;
      o[ti + 1] = o[ti + 1]! + Math.sin(this.wagPhase - lag) * this.wagAmp * (i === 0 ? 0.45 : tipBias);
      if (this.tailMode === 'wag_slow' || this.tailMode === 'idle') {
        o[ti] = o[ti]! + Math.cos(this.wagPhase * 0.6 - lag) * 0.08;
      }
    }
    const t0i = this.index.tail0! * 3;
    o[t0i] = o[t0i]! - (this.tailRaise + puff);
  }

  private headLayer(dt: number) {
    let yaw = 0, pitch = 0;
    if (this.look.point && this.look.weight > 0) {
      const neck = this.model.bones.neck!;
      neck.updateWorldMatrix(true, false);
      const head = this.model.bones.head!;
      head.getWorldPosition(_v2);
      _v.copy(this.look.point).sub(_v2);
      this.model.bones.chest!.getWorldQuaternion(_q).invert();
      _v.applyQuaternion(_q);
      yaw = Math.atan2(_v.x, _v.z);
      pitch = -Math.atan2(_v.y, Math.hypot(_v.x, _v.z));
      yaw = THREE.MathUtils.clamp(yaw, -1.25, 1.25) * this.look.weight;
      pitch = THREE.MathUtils.clamp(pitch, -0.85, 0.75) * this.look.weight;
    }
    this.lookYaw = smoothTo(this.lookYaw, yaw, 7, dt);
    this.lookPitch = smoothTo(this.lookPitch, pitch, 7, dt);
    this.headTiltCur = smoothTo(this.headTiltCur, this.headTilt, 5, dt);
    const o = this.out;
    const nckI = this.index.neck! * 3;
    const hedI = this.index.head! * 3;
    o[nckI + 1] = o[nckI + 1]! + this.lookYaw * 0.45;
    o[hedI + 1] = o[hedI + 1]! + this.lookYaw * 0.55;
    o[nckI] = o[nckI]! + this.lookPitch * 0.35;
    o[hedI] = o[hedI]! + this.lookPitch * 0.55;
    o[hedI + 2] = o[hedI + 2]! + this.headTiltCur;
    this.eyeYaw = smoothTo(this.eyeYaw, (yaw - this.lookYaw) * 0.8, 14, dt);
    this.eyePitch = smoothTo(this.eyePitch, (pitch - this.lookPitch) * 0.8, 14, dt);
  }

  private faceLayer(dt: number) {
    const m = this.model;
    const jawT = this.jawHold > 0 ? this.jawHold : this.mouthOpen * 0.42;
    this.jawCur = smoothTo(this.jawCur, jawT, 18, dt);
    const jawI = this.index.jaw! * 3;
    this.out[jawI] = this.out[jawI]! + this.jawCur;

    this.tongueCur = smoothTo(this.tongueCur, this.jawHold > 0 ? 0 : this.tongueOut, 10, dt);
    const d = m.design.dims;
    m.tongue.position.copy(m.tongueRest);
    m.tongue.position.z += this.tongueCur * d.muzzleL * d.hs * 0.6;
    m.tongue.position.y -= this.tongueCur * 0.005 * d.hs;
    m.tongue.rotation.x = this.tongueCur * 0.35;
    m.tongue.scale.set(1, 1, 1 + this.tongueCur * 0.3);

    // j4lpan-inspired blink + occasional double-blink
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blinkAmt = 1;
      if (this.doubleBlinkPending) {
        this.doubleBlinkPending = false;
        this.blinkT = 2.6 + Math.random() * 3.2;
      } else if (Math.random() < 0.24) {
        this.doubleBlinkPending = true;
        this.blinkT = 0.22;
      } else {
        this.blinkT = 2.2 + Math.random() * 3.8;
      }
    }
    this.blinkAmt = Math.max(0, this.blinkAmt - dt * 7);
    const blink = this.blinkAmt > 0.5 ? (1 - this.blinkAmt) * 2 : this.blinkAmt * 2;
    this.lidCur = smoothTo(this.lidCur, this.eyesClosed, 8, dt);
    m.setLids(Math.min(1, Math.max(this.lidCur, blink, this.happy * 0.38)), this.happy);
    for (const e of m.eyes) {
      e.ball.rotation.set(this.eyePitch, this.eyeYaw, 0);
    }
  }

  private earLayer(dt: number) {
    const m = this.model;
    const sides = [1, -1] as const;
    const poseEar = CAT_POSES[this.pose]?.ears ?? 0;
    const netPerk = THREE.MathUtils.clamp(this.earPerk + poseEar, -1, 1);
    for (let i = 0; i < 2; i++) {
      const b = m.bones[i === 0 ? 'ear_L' : 'ear_R']!;
      const side = sides[i]!;
      const back = Math.max(0, -netPerk);
      const fwd = Math.max(0, netPerk);
      // Occasional asymmetric feline ear twitch
      const twitch = Math.sin(this.time * 1.1 + i * 2.7) > 0.988 ? 0.24 : 0;
      this.earAng[i] = smoothTo(this.earAng[i]!, -back * 0.85 + fwd * 0.16 + twitch, 11, dt);
      b.rotation.set(-this.earAng[i]! * 0.85, 0, back * 0.55 * side);
    }
  }
}
