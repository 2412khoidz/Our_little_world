// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/dog/patterns.ts
// Feline vertex coat painter: mackerel tabby stripes, cream-point shading, calico patches, pink toe beans.
import * as THREE from 'three';
import type { CatCoatDef } from './catBreeds';
import type { CatDesign } from './catDesign';

export interface CatPaintCtx {
  p: [number, number, number];
  n: [number, number, number];
  tags: Record<string, number>;
  design: CatDesign;
  hx: number;
  hy: number;
  hz: number;
  u: number;
  eyeD: number;
  tailF: number;
}

export interface CatPaint {
  color: THREE.Color;
  fur: number;
  gloss: number;
}

function hash3(x: number, y: number, z: number) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

function fbm(x: number, y: number, z: number) {
  return vnoise(x, y, z) * 0.6 + vnoise(x * 2.1 + 7, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3 + 3, z * 4.3) * 0.1;
}

const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const colorCache = new Map<string, THREE.Color>();
function col(hex: string) {
  let c = colorCache.get(hex);
  if (!c) { c = new THREE.Color(hex); colorCache.set(hex, c); }
  return c;
}

function sum(t: Record<string, number>, ...keys: string[]) {
  let s = 0;
  for (const k of keys) s += t[k] || 0;
  return s;
}

function masks(c: CatPaintCtx) {
  const { p, n, tags, design } = c;
  const d = design.dims;
  const noise = fbm(p[0] * 65, p[1] * 65, p[2] * 65) - 0.5;
  const head = sum(tags, 'skull', 'brow', 'cheek', 'muzzle', 'lip', 'nose', 'jaw', 'chin');
  const muzzle = sum(tags, 'muzzle', 'lip', 'chin', 'jaw', 'nose');
  const legs = sum(tags, 'legF', 'legH', 'paw');
  const inner = legs * clamp01(-Math.sign(p[0]) * n[0] * 1.4);
  const pawSocks = ss(d.H * 0.25, d.H * 0.08, p[1]) * (1 - head) * (1 - sum(tags, 'tail'));
  const belly = sum(tags, 'belly') * ss(-0.15, -0.65, n[1]) + sum(tags, 'ribs', 'chest') * ss(-0.5, -0.85, n[1]);
  const chestBib = sum(tags, 'chest', 'throat') * ss(0.05, 0.65, n[2] - n[1] * 0.25);
  const backTop = sum(tags, 'back', 'ribs', 'rump', 'neck', 'shoulder') * ss(0.15, 0.85, n[1]);
  const muzzleLower = muzzle * ss(0.55, -0.15, n[1]);
  const cheekWhisker = sum(tags, 'cheek') * ss(0.45, -0.25, n[1]) * ss(0.01, 0.045, c.hz);
  return { noise, head, muzzle, legs, inner, pawSocks, belly, chestBib, backTop, muzzleLower, cheekWhisker };
}

export function paintCatVertex(c: CatPaintCtx, coat: CatCoatDef, furRegions: Record<string, number>): CatPaint {
  const m = masks(c);
  const baseHex = coat.colors.base ?? '#e58e44';
  const out = new THREE.Color(baseHex);
  const light = col(coat.colors.light ?? baseHex);
  const dark = col(coat.colors.dark ?? baseHex);
  const cream = col(coat.colors.cream || '#fff4e3');

  // Base gradient shading
  out.lerp(light, clamp01(m.belly * 0.45 + m.inner * 0.4 + m.noise * 0.22));
  out.lerp(dark, clamp01(m.backTop * 0.2 + (c.tags.ear || 0) * 0.22 - m.noise * 0.16));

  if (coat.pattern === 'tabby') {
    const trunk = sum(c.tags, 'back', 'ribs', 'rump', 'shoulder', 'thigh', 'neck');
    // Mackerel vertical flank stripes + dorsal spine stripe
    const warp = m.noise * 0.035;
    const ribWave = Math.sin((c.p[2] + warp) * 72 + Math.abs(c.p[0]) * 18);
    const dorsal = ss(0.022, 0.004, Math.abs(c.p[0]) + Math.abs(m.noise) * 0.01);
    const flankStripe = trunk * ss(0.32, 0.78, ribWave) * (1 - m.belly * 0.9);
    // Forehead tabby "M" markings & cheek ribbons
    const brow = sum(c.tags, 'skull', 'brow');
    const foreheadStripe = brow * ss(0.45, 0.82, Math.cos(Math.abs(c.hx) * 145 + c.hz * 22)) * ss(0.02, 0.075, c.hy);
    // Ringed tail stripes
    const tailRing = (c.tags.tail || 0) * ss(0.35, 0.78, Math.sin(c.tailF * 34));
    const stripeMask = clamp01(Math.max(flankStripe * 0.85, dorsal * trunk * 0.75, foreheadStripe * 0.85, tailRing * 0.9));
    out.lerp(dark, stripeMask * 0.88);

    // Cream chest bib, chin, whisker puffs, tummy & little white paws ("tất kem")
    const creamMask = clamp01(
      Math.max(m.chestBib * 0.95, m.belly * 0.9, m.muzzleLower * 0.95, m.cheekWhisker * 0.85, m.pawSocks * 0.95) +
        m.noise * 0.18,
    );
    out.lerp(cream, ss(0.28, 0.68, creamMask));
  } else if (coat.pattern === 'cream-point') {
    const pts = clamp01(
      Math.max((c.tags.ear || 0) * 0.9, m.muzzle * 0.5, (c.tags.tail || 0) * ss(0.35, 0.95, c.tailF)) +
        m.noise * 0.15,
    );
    out.lerp(dark, pts * 0.72);
    out.lerp(cream, clamp01(m.belly + m.chestBib * 0.8 + m.pawSocks * 0.7));
  } else if (coat.pattern === 'calico') {
    const ginger = col(coat.colors.ginger || '#e9893d');
    const cocoa = col(coat.colors.cocoa || '#4c342b');
    const b1 = fbm(c.p[0] * 14 + 2.3, c.p[1] * 14, c.p[2] * 14 + 5.1);
    const b2 = fbm(c.p[0] * 15 + 9.4, c.p[1] * 15 + 3.2, c.p[2] * 15);
    const patchZone = (1 - clamp01(m.belly * 1.2 + m.chestBib + m.pawSocks * 0.9));
    const gMask = ss(0.49, 0.58, b1) * patchZone;
    const cMask = ss(0.55, 0.64, b2) * patchZone;
    out.lerp(ginger, gMask);
    out.lerp(cocoa, cMask);
    // Classic calico ear patches
    if ((c.tags.ear || 0) > 0.35) {
      out.lerp(c.p[0] > 0 ? ginger : cocoa, ss(0.35, 0.7, c.tags.ear || 0));
    }
  }

  // Pink inner ear
  if ((c.tags.ear || 0) > 0.25 && c.n[2] > 0.15) {
    const innerEar = ss(0.25, 0.65, c.tags.ear || 0) * ss(0.15, 0.6, c.n[2]);
    out.lerp(col(coat.colors.earInner || '#f4a8b3'), innerEar * 0.75);
  }

  // Fur length from region multipliers
  let fur = 0, tw = 0;
  for (const [k, v] of Object.entries(c.tags)) {
    const r = furRegions[k] ?? 1;
    fur += r * v;
    tw += v;
  }
  fur = tw > 0 ? fur / tw : 1;
  let gloss = 0;

  // Petite pink cat nose
  const nose = c.tags.nose || 0;
  if (nose > 0.25) {
    out.lerp(col(coat.nose), ss(0.25, 0.6, nose));
    fur *= 1 - ss(0.25, 0.55, nose);
    gloss = Math.max(gloss, ss(0.3, 0.7, nose) * 0.85);
  }

  // Soft pink paw pads
  const paw = c.tags.paw || 0;
  if (paw > 0.3 && c.n[1] < -0.45 && c.p[1] < c.design.dims.pawR * 0.45) {
    const k = ss(-0.45, -0.75, c.n[1]);
    out.lerp(col(coat.pad), k);
    fur *= 1 - k;
    gloss = Math.max(gloss, 0.25 * k);
  }

  // Eye rims
  if (c.eyeD < 2.4) {
    const bare = ss(1.15, 2.3, c.eyeD);
    fur *= bare;
    if (fur < 1) out.multiplyScalar(0.84 + 0.16 * bare);
    const rim = ss(1.42, 1.1, c.eyeD);
    out.lerp(col('#261a16'), rim * 0.78);
    gloss = Math.max(gloss, rim * 0.25);
  }

  return { color: out, fur, gloss };
}
