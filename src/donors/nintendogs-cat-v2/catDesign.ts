// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/dog/design.ts
// Sculpted specifically for authentic domestic cat proportions (round skull, petite muzzle, erect triangular ears, long 5-bone tail).
import type { CatBreed } from './catBreeds';
import {
  BoneSpec, Prim, V3, add, basisFromY, ellipsoid, evalField, flatCone, lerp3, mulM3, norm,
  rotXYZ, roundBox, roundCone, scale, sphere, sub,
} from './sdf';

export interface BoneDef {
  name: string;
  parent: string | null;
  pos: V3;
}

export interface ContactDef {
  bone: string;
  pos: V3;
  name: string;
}

export interface CatDims {
  H: number;
  BL: number;
  CD: number;
  g: number;
  hs: number;
  shZ: number;
  hipZ: number;
  atlas: V3;
  jawHinge: V3;
  noseTip: V3;
  pawR: number;
  eyeR: number;
  headTop: number;
  tailBase: V3;
  tailTip: V3;
  voxel: number;
  earSide: 'erect';
  mouthZ: number;
  stopZ: number;
  muzzleW: number;
  muzzleL: number;
  neckRadius: number;
}

export interface CatDesign {
  bones: BoneDef[];
  body: Prim[];
  jaw: Prim[];
  ears: Prim[][];
  earNormals: V3[];
  eyes: { pos: V3[]; dir: V3[]; r: number };
  tongue: { pos: V3; r: V3 };
  whiskerAnchors: { pos: V3; side: 1 | -1 }[];
  contacts: ContactDef[];
  dims: CatDims;
  furRegions: Record<string, number>;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export const DEFAULT_CAT_FUR_REGIONS: Record<string, number> = {
  nose: 0,
  lip: 0.25,
  muzzle: 0.35,
  chin: 0.42,
  jaw: 0.42,
  brow: 0.55,
  skull: 0.68,
  cheek: 0.85,
  throat: 0.95,
  ear: 0.42,
  neck: 1.0,
  chest: 1.05,
  ribs: 0.95,
  back: 0.95,
  belly: 0.85,
  rump: 0.95,
  shoulder: 0.88,
  thigh: 0.95,
  legFup: 0.82,
  legF: 0.52,
  legHup: 0.92,
  legH: 0.55,
  paw: 0.36,
  tail: 1.25,
};

export function designCat(breed: CatBreed): CatDesign {
  const s = breed.shape;
  const { H, BL, CD, CW, HW } = s;
  const g = CD / 0.145;
  const hs = s.hs;
  const shZ = BL / 2;
  const hipZ = -BL / 2;
  const lf = s.pawR / 0.025;
  const lt = s.legT * lf;
  const pawR = s.pawR;
  const pawY = pawR * 0.52;

  const bones: BoneDef[] = [];
  const bone = (name: string, parent: string | null, pos: V3) => bones.push({ name, parent, pos });

  const bodyC: V3 = [0, H - CD * 0.45, 0];
  const pelvisC: V3 = [0, H * 0.84, hipZ + 0.03 * g];
  const chestC: V3 = [0, H - CD * 0.4, shZ - 0.06 * g];

  bone('root', null, [0, 0, 0]);
  bone('body', 'root', bodyC);
  bone('pelvis', 'body', pelvisC);
  bone('chest', 'body', chestC);

  const fx = CW * 0.34;
  const hx = HW * 0.35;
  const legs = (side: 1 | -1, sfx: string) => {
    const shoulderJ: V3 = [fx * side, H - CD * 0.42, shZ - 0.004 * g];
    const elbow: V3 = [fx * 1.02 * side, H - CD + 0.004 * g, shZ - 0.028 * g];
    const wrist: V3 = [fx * 0.96 * side, pawY + (elbow[1] - pawY) * 0.3, shZ - 0.012 * g];
    const fpaw: V3 = [fx * 0.96 * side, pawY, shZ - 0.004 * g];
    bone('upperarm' + sfx, 'chest', shoulderJ);
    bone('forearm' + sfx, 'upperarm' + sfx, elbow);
    bone('wrist' + sfx, 'forearm' + sfx, wrist);
    bone('fpaw' + sfx, 'wrist' + sfx, fpaw);

    const hipJ: V3 = [hx * side, H * 0.8, hipZ + 0.025 * g];
    const span = hipJ[1] - pawY;
    const knee: V3 = [hx * 1.06 * side, hipJ[1] - span * 0.4, hipZ + 0.064 * g];
    const hock: V3 = [hx * side, pawY + span * 0.28, hipZ - 0.014 * g];
    const hpaw: V3 = [hx * side, pawY, hipZ - 0.004 * g];
    bone('thigh' + sfx, 'pelvis', hipJ);
    bone('shin' + sfx, 'thigh' + sfx, knee);
    bone('meta' + sfx, 'shin' + sfx, hock);
    bone('hpaw' + sfx, 'meta' + sfx, hpaw);
    return { shoulderJ, elbow, wrist, fpaw, hipJ, knee, hock, hpaw };
  };
  const L = legs(1, '_L');
  const R = legs(-1, '_R');

  const neckBase: V3 = [0, H - CD * 0.16, shZ - 0.008 * g];
  const nk = s.neckL * Math.pow(g, 0.7);
  const A: V3 = add(neckBase, [0, 0.068 * nk, 0.048 * nk]);
  bone('neck', 'chest', neckBase);
  bone('head', 'neck', A);

  const hp = (x: number, y: number, z: number): V3 => [A[0] + x * hs, A[1] + y * hs, A[2] + z * hs];
  const [skW, skH, skL] = s.skull;
  const [mW, mH, mL] = s.muzzle;
  const drop = s.muzzleDrop;
  const stopZ = 0.024 + skL * 0.45;
  const jawHinge = hp(0, -0.012, 0.036);
  bone('jaw', 'head', jawHinge);

  const earBase = (side: 1 | -1): V3 => hp(s.ear.pos[0] * side, s.ear.pos[1], s.ear.pos[2]);
  bone('ear_L', 'head', earBase(1));
  bone('ear_R', 'head', earBase(-1));

  // Long supple 5-bone cat tail
  const rumpR: V3 = [HW * 0.5, CD * 0.46, BL * 0.18];
  const rumpC: V3 = [0, H * 0.955 - rumpR[1], hipZ + 0.025 * g];
  const t = s.tail;
  const tailBase: V3 = [0, rumpC[1] + rumpR[1] * 0.45, rumpC[2] - rumpR[2] * 0.78];
  const NT = 5;
  const tailPts: V3[] = [tailBase];
  for (let i = 0; i < NT; i++) {
    const f = (i + 0.5) / NT;
    const ang = t.carry + t.curl * f;
    const d = norm([t.side * f * 0.9, Math.sin(ang), -Math.cos(ang)]);
    tailPts.push(add(tailPts[i]!, scale(d, t.L / NT)));
  }
  for (let i = 0; i < NT; i++) bone('tail' + i, i === 0 ? 'pelvis' : 'tail' + (i - 1), tailPts[i]!);

  const spineW: BoneSpec = (_x, _y, z) => {
    const u = (z - hipZ) / (shZ - hipZ);
    const wp = 1 - smooth(0.05, 0.5, u);
    const wc = smooth(0.45, 0.92, u);
    return [['pelvis', wp], ['body', Math.max(0, 1 - wp - wc)], ['chest', wc]];
  };
  const neckDir = sub(A, neckBase);
  const neckLen2 = Math.max(1e-6, neckDir[0] ** 2 + neckDir[1] ** 2 + neckDir[2] ** 2);
  const neckW: BoneSpec = (x, y, z) => {
    const u = ((x - neckBase[0]) * neckDir[0] + (y - neckBase[1]) * neckDir[1] + (z - neckBase[2]) * neckDir[2]) / neckLen2;
    const wc = 1 - smooth(-0.1, 0.35, u);
    const wh = smooth(0.7, 1.05, u);
    return [['chest', wc], ['neck', Math.max(0, 1 - wc - wh)], ['head', wh]];
  };

  const flowBack: V3 = [0, -0.25, -1];
  const flowDown: V3 = [0, -1, -0.15];

  const body: Prim[] = [];
  const P = (p: Prim) => body.push(p);
  const kb = 0.028 * g;

  P(ellipsoid([0, H - CD * 0.5, shZ - BL * 0.19], [CW * 0.5, CD * 0.5, BL * 0.31], { bone: spineW, tag: 'ribs', k: kb, flow: flowBack }));
  P(ellipsoid([0, H - CD * 0.55, shZ + 0.004 * g], [CW * 0.38, CD * 0.38, 0.045 * g], { bone: 'chest', tag: 'chest', k: kb, flow: flowDown }));
  const loinRy = CD * 0.37 * (1 - 0.3 * s.tuck);
  P(ellipsoid([0, H * 0.975 - loinRy, -BL * 0.1], [CW * 0.44, loinRy, BL * 0.25], { bone: spineW, tag: 'back', k: kb * 1.2, flow: flowBack }));
  const bellyRy = CD * 0.3 * s.belly * (1 - 0.35 * s.tuck);
  P(ellipsoid([0, H - CD * (0.62 + 0.06 * (1 - s.tuck)), -BL * 0.02], [CW * 0.4, bellyRy, BL * 0.24], { bone: spineW, tag: 'belly', k: kb * 1.3, flow: flowBack }));
  P(ellipsoid(rumpC, rumpR, { bone: 'pelvis', tag: 'rump', k: kb, flow: [0, -0.6, -1] }));

  for (const [side, sfx, J] of [[1, '_L', L], [-1, '_R', R]] as const) {
    P(ellipsoid([CW * 0.33 * side, H - CD * 0.34, shZ - 0.025 * g], [CW * 0.15, CD * 0.4, 0.045 * g],
      { bone: [['chest', 0.65], ['upperarm' + sfx, 0.35]], tag: 'shoulder', k: kb, flow: flowDown }, rotXYZ(-0.35, 0, 0)));
    P(roundCone(J.shoulderJ, J.elbow, 0.03 * g, 0.022 * lt, { bone: 'upperarm' + sfx, tag: 'legFup', k: 0.02 * g, flow: flowDown }));
    P(sphere(add(J.elbow, [0, 0.002, -0.006 * lf]), 0.017 * lt, { bone: 'forearm' + sfx, tag: 'legF', k: 0.01 * lt, flow: flowDown }));
    P(roundCone(J.elbow, J.wrist, 0.021 * lt, 0.016 * lt, { bone: 'forearm' + sfx, tag: 'legF', k: 0.01 * lt, flow: flowDown }));
    P(roundCone(J.wrist, J.fpaw, 0.0165 * lt, 0.017 * lt, { bone: 'wrist' + sfx, tag: 'legF', k: 0.008 * lt, flow: flowDown }));
    paw(J.fpaw, 'fpaw' + sfx, side, 1);

    const tdir = norm(sub(J.knee, J.hipJ));
    const tl = Math.hypot(...sub(J.knee, J.hipJ));
    P(ellipsoid(add(lerp3(J.hipJ, J.knee, 0.36), [HW * 0.04 * side, 0, 0.004 * g]), [HW * 0.16, tl * 0.6, 0.046 * g],
      { bone: 'thigh' + sfx, tag: 'thigh', k: kb, flow: flowDown }, basisFromY(tdir)));
    P(roundCone(J.hipJ, J.knee, 0.035 * g, 0.024 * lt, { bone: 'thigh' + sfx, tag: 'legHup', k: 0.018 * g, flow: flowDown }));
    P(roundCone(J.knee, J.hock, 0.023 * lt, 0.0145 * lt, { bone: 'shin' + sfx, tag: 'legH', k: 0.01 * lt, flow: flowDown }));
    P(sphere(add(J.hock, [0, 0.003 * lf, -0.008 * lf]), 0.012 * lt, { bone: 'meta' + sfx, tag: 'legH', k: 0.007 * lt, flow: flowDown }));
    P(roundCone(J.hock, J.hpaw, 0.0145 * lt, 0.0165 * lt, { bone: 'meta' + sfx, tag: 'legH', k: 0.008 * lt, flow: flowDown }));
    paw(J.hpaw, 'hpaw' + sfx, side, 0.95);
  }

  function paw(c: V3, b: string, side: number, sz: number) {
    const r = pawR * sz;
    P(ellipsoid(add(c, [0, 0, r * 0.28]), [r * 0.8, r * 0.56, r * 0.92], { bone: b, tag: 'paw', k: 0.01 * lf, flow: [0, -0.3, 1] }));
    for (const a of [-1.4, -0.48, 0.48, 1.4]) {
      const ang = a * 0.34;
      const tc: V3 = add(c, [Math.sin(ang) * r * 0.58 * side, -r * 0.18, r * 0.28 + Math.cos(ang) * r * 0.56]);
      P(sphere(tc, r * 0.3, { bone: b, tag: 'paw', k: 0.007 * lf, flow: [0, -0.3, 1] }));
    }
  }

  // Neck + throat
  P(roundCone(neckBase, hp(0, -0.01, -0.004), 0.056 * g * s.neckT, 0.042 * hs * s.neckT,
    { bone: neckW, tag: 'neck', k: 0.028 * g, flow: () => norm([0, -0.5, -1]) }));
  P(ellipsoid(add(lerp3(neckBase, A, 0.62), [0, -0.022 * hs, 0.016 * hs]), [0.036 * hs * s.neckT, 0.036 * hs, 0.034 * hs],
    { bone: neckW, tag: 'throat', k: 0.025 * g, flow: [0, -1, -0.4] }));

  // Round feline head & plump whisker cheeks
  const kh = 0.017 * hs;
  const headFlow = (): V3 => norm([0, -0.15, -1]);
  P(ellipsoid(hp(0, 0.026, 0.025), [skW / 2 * hs, skH / 2 * hs, skL / 2 * hs], { bone: 'head', tag: 'skull', k: kh, flow: headFlow }));
  P(ellipsoid(hp(0, 0.031, stopZ - 0.014), [skW * 0.33 * hs, 0.022 * hs, 0.024 * hs], { bone: 'head', tag: 'skull', k: kh, flow: headFlow }));
  const whiskerAnchors: { pos: V3; side: 1 | -1 }[] = [];
  for (const side of [1, -1] as const) {
    P(ellipsoid(hp(0.018 * side, s.eyeY + 0.01, stopZ - 0.004), [0.015 * hs, 0.01 * hs * s.stop, 0.012 * hs * s.stop], { bone: 'head', tag: 'brow', k: kh * 0.8, flow: headFlow }));
    P(ellipsoid(hp(0.030 * side, -0.004, stopZ - 0.012), [0.022 * hs * s.cheek, 0.023 * hs, 0.025 * hs], { bone: 'head', tag: 'cheek', k: kh, flow: [0, -0.3, -1] }));
    // Plump cat whisker pads (:3)
    const padPos = hp(0.011 * side, -0.008 - drop * 0.5, stopZ + mL * 0.45);
    P(sphere(padPos, 0.0105 * hs, { bone: 'head', tag: 'lip', k: 0.009 * hs, flow: [side * 0.4, -0.2, 0.5] }));
    whiskerAnchors.push({ pos: padPos, side });
  }

  // Petite cat muzzle & tiny triangular pink nose
  const mY = 0.002 - drop;
  const rr = Math.min(mW, mH) * 0.44 * hs;
  const mC = hp(0, mY, stopZ + mL * 0.45 - 0.004);
  P(roundBox(mC, [Math.max(0.001, mW * 0.48 * hs - rr), Math.max(0.001, mH * 0.48 * hs - rr), Math.max(0.001, mL * 0.48 * hs - rr * 0.5)], rr,
    { bone: 'head', tag: 'muzzle', k: 0.016 * hs, flow: [0, 0.1, -1] }, rotXYZ(0.05, 0, 0)));
  const muzzleFront = mC[2] + mL * 0.5 * hs + rr * 0.5;
  const noseC: V3 = [0, mC[1] + mH * 0.25 * hs, muzzleFront - 0.004 * hs];
  const nr: V3 = [0.0092 * hs * s.nose, 0.0068 * hs * s.nose, 0.0062 * hs * s.nose];
  P(ellipsoid(noseC, nr, { bone: 'head', tag: 'nose', k: 0.004 * hs, flow: [0, 0, -1] }));

  // Eyes sunk neatly into the feline skull
  const eyePos: V3[] = [];
  const eyeDir: V3[] = [];
  const headOnly = body.slice();
  for (const side of [1, -1]) {
    const dir = norm([Math.sin(s.eyeOut) * side, 0.04, Math.cos(s.eyeOut)]);
    let q = hp(s.eyeX * side, s.eyeY, s.eyeZ);
    for (let i = 0; i < 12; i++) {
      const f = evalField(headOnly, q[0], q[1], q[2]);
      q = add(q, scale(dir, -f));
    }
    const e = add(q, scale(dir, -s.eyeR * s.eyeSink));
    eyePos.push(e);
    eyeDir.push(dir);
    P(sphere(e, s.eyeR * 1.07, { bone: 'head', tag: 'eye', k: 0.004 * hs, sub: true }));
  }

  // Smooth Catmull-Rom 5-bone tail
  const taper = t.type === 'bob' ? 0.2 : 0.42;
  const SUB = 3;
  const cr = (i: number, u: number): V3 => {
    const p0 = tailPts[Math.max(0, i - 1)]!, p1 = tailPts[i]!, p2 = tailPts[i + 1]!, p3 = tailPts[Math.min(NT, i + 2)]!;
    const u2 = u * u, u3 = u2 * u;
    const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
    return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])];
  };
  for (let i = 0; i < NT; i++) {
    for (let j = 0; j < SUB; j++) {
      const u0 = j / SUB, u1 = (j + 1) / SUB;
      const f0 = (i + u0) / NT, f1 = (i + u1) / NT;
      const r0 = t.T * (1 - taper * f0), r1 = t.T * (1 - taper * f1);
      const a = cr(i, u0), b = cr(i, u1);
      const dir = norm(sub(b, a));
      const first = i === 0 && j === 0;
      P(roundCone(a, b, r0, r1, { bone: 'tail' + i, tag: 'tail', k: first ? 0.02 * g : Math.min(0.004, r1 * 0.3), flow: dir }));
    }
  }

  // Petite jaw & chin
  const jaw: Prim[] = [];
  const mwS = mW / 0.036;
  const jf = 0.6;
  jaw.push(flatCone(hp(0, -0.017 * jf, 0.042), hp(0, -0.018 * jf - drop, stopZ + mL * 0.6), 0.013 * hs * mwS * jf, 0.009 * hs * mwS * jf, 1, 0.7,
    { bone: 'jaw', tag: 'jaw', k: 0.008 * hs, flow: [0, -0.2, -1] }, [0, 1, 0]));
  jaw.push(ellipsoid(hp(0, -0.021 * jf - drop, stopZ + mL * 0.45), [0.011 * hs * mwS * jf, 0.007 * hs * jf, 0.011 * hs * jf],
    { bone: 'jaw', tag: 'chin', k: 0.008 * hs, flow: [0, -0.3, -1] }));

  // Erect triangular cat ears
  const ears: Prim[][] = [];
  const earNormals: V3[] = [];
  const e = s.ear;
  for (const side of [1, -1] as const) {
    const b = earBase(side);
    const eb = side > 0 ? 'ear_L' : 'ear_R';
    const list: Prim[] = [];
    const EL = e.L * hs, EW = e.W * hs, ET = e.T * hs;
    const Rm = rotXYZ(e.lean, 0, -e.splay * side);
    const up = mulM3(Rm, [0, 1, 0]);
    const fwd = mulM3(Rm, [0, 0, 1]);
    earNormals.push(fwd);
    const tip = add(b, scale(up, EL));
    const depth = (ET * 2.5) / EW;
    const tipRatio = e.type === 'rounded' ? 0.16 : 0.05;
    list.push(flatCone(b, tip, EW / 2, EW * tipRatio, 1, depth * 1.5, { bone: eb, tag: 'ear', k: 0.003 * hs, flow: up }, fwd));
    list.push(flatCone(
      add(add(b, scale(fwd, ET * 1.15)), scale(up, EL * 0.1)),
      add(add(tip, scale(up, -EL * 0.14)), scale(fwd, ET * 0.32)),
      EW * 0.37,
      EW * 0.03,
      1,
      depth * 1.25,
      { bone: eb, tag: 'ear', k: 0.003 * hs, sub: true },
      fwd,
    ));
    list.push(ellipsoid(add(b, scale(up, -0.004 * hs)), [EW * 0.42, 0.011 * hs, ET * 1.5], { bone: eb, tag: 'ear', k: 0.004 * hs, flow: up }, Rm));
    ears.push(list);
  }

  // Contacts for floor solver
  const contacts: ContactDef[] = [];
  const C = (name: string, b: string, p: V3) => contacts.push({ bone: b, pos: p, name });
  for (const [sfx, J] of [['_L', L], ['_R', R]] as const) {
    C('fpaw', 'fpaw' + sfx, [J.fpaw[0], 0, J.fpaw[2] + pawR * 0.25]);
    C('fpaw', 'fpaw' + sfx, [J.fpaw[0], 0.004, J.fpaw[2] + pawR * 0.9]);
    C('fpaw', 'fpaw' + sfx, [J.fpaw[0], 0.004, J.fpaw[2] - pawR * 0.45]);
    C('hpaw', 'hpaw' + sfx, [J.hpaw[0], 0, J.hpaw[2] + pawR * 0.25]);
    C('hpaw', 'hpaw' + sfx, [J.hpaw[0], 0.004, J.hpaw[2] + pawR * 0.9]);
    C('hock', 'meta' + sfx, [J.hock[0], J.hock[1] - 0.004, J.hock[2] - 0.012 * lf]);
    C('hock', 'meta' + sfx, [J.hock[0], (J.hock[1] + J.hpaw[1]) / 2, J.hock[2] - 0.01 * lf]);
    C('elbow', 'forearm' + sfx, [J.elbow[0], J.elbow[1] - 0.01 * lf, J.elbow[2] - 0.005]);
    C('wrist', 'wrist' + sfx, [J.wrist[0], J.wrist[1], J.wrist[2] - 0.01 * lf]);
    C('wrist', 'fpaw' + sfx, [J.fpaw[0], J.fpaw[1], J.fpaw[2] - pawR * 0.5]);
    C('knee', 'shin' + sfx, [J.knee[0], J.knee[1] - 0.008, J.knee[2] + 0.015 * lf]);
    C('knee', 'thigh' + sfx, [J.knee[0] * 1.25, J.knee[1] + 0.018 * g, J.knee[2]]);
  }
  C('sternum', 'chest', [0, H - CD - 0.003, shZ - 0.045 * g]);
  C('sternum', 'chest', [0, H - CD * 0.6, shZ + 0.045 * g]);
  C('belly', 'body', [0, H - CD * 0.96, -BL * 0.02]);
  C('butt', 'pelvis', [0, H * 0.62, hipZ - 0.018 * g]);
  C('butt', 'pelvis', [0, H * 0.72, hipZ - 0.045 * g]);
  for (const side of [1, -1]) {
    C('hip', 'pelvis', [HW * 0.48 * side, H * 0.78, hipZ + 0.025 * g]);
    C('ribs', 'chest', [CW * 0.48 * side, H - CD * 0.5, shZ - 0.07 * g]);
    C('ribs', 'body', [CW * 0.45 * side, H - CD * 0.45, -BL * 0.05]);
    C('head', 'head', hp(0.048 * side, 0.02, 0.025));
  }
  C('back', 'body', [0, H, 0]);
  C('back', 'chest', [0, H, shZ - 0.05 * g]);
  C('back', 'pelvis', [0, H * 0.96, hipZ + 0.02]);
  C('chin', 'head', hp(0, -0.036, 0.05));
  C('head', 'head', hp(0, 0.07, 0.025));

  const tailTip = tailPts[NT]!;
  const headTop = A[1] + (0.026 + skH / 2) * hs;
  const voxel = Math.max(0.0024, 0.0044 * Math.pow(Math.max(g, hs * 0.8), 0.8));

  const furRegions: Record<string, number> = { ...DEFAULT_CAT_FUR_REGIONS };
  for (const [k, v] of Object.entries(breed.fur.regions)) if (v !== undefined) furRegions[k] = v;

  return {
    bones,
    body,
    jaw,
    ears,
    earNormals,
    eyes: { pos: eyePos, dir: eyeDir, r: s.eyeR },
    tongue: { pos: hp(0, -0.013 - drop, stopZ + mL * 0.25), r: [0.011 * hs, 0.0036 * hs, 0.014 * hs] },
    whiskerAnchors,
    contacts,
    dims: {
      H, BL, CD, g, hs, shZ, hipZ, atlas: A, jawHinge, noseTip: add(noseC, [0, 0, nr[2]]), pawR,
      eyeR: s.eyeR, headTop, tailBase, tailTip, voxel, earSide: 'erect',
      mouthZ: stopZ + mL * 0.25, stopZ, muzzleW: mW, muzzleL: mL,
      neckRadius: 0.044 * hs * s.neckT,
    },
    furRegions,
  };
}
