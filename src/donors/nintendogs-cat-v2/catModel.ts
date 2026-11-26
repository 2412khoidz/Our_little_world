// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/dog/dogModel.ts
// 3D SkinnedMesh cat builder with shell fur, vertical-slit feline eyes, 3D whiskers, and OLW accessories.
import * as THREE from 'three';
import type { CatAccessoryId } from '../../shared/petLiving/petVisualTypes';
import { CAT_ACCESSORIES } from '../../shared/petLiving/petVisualTypes';
import type { CatBreed, CatCoatDef } from './catBreeds';
import { CatDesign, designCat } from './catDesign';
import { FurUniforms, makeFurMaterial, makeFurUniforms } from './fur';
import { paintCatVertex } from './catPatterns';
import { evalField, Prim, sampleGrid } from './sdf';
import { surfaceNets } from './surfaceNets';

export interface EyeRig {
  pivot: THREE.Object3D;
  ball: THREE.Mesh;
  lidUpper: THREE.Object3D;
  lidLower: THREE.Object3D;
  restDir: THREE.Vector3;
}

export interface ContactPoint {
  bone: THREE.Bone;
  local: THREE.Vector3;
  name: string;
}

export interface CatModelOptions {
  quality?: number;
  accessory?: CatAccessoryId;
}

interface Component {
  prims: Prim[];
  voxel: number;
  name: string;
}

const tmpV = new THREE.Vector3();
const tmpM = new THREE.Matrix4();

export class CatModel {
  readonly root = new THREE.Group();
  readonly bones: Record<string, THREE.Bone> = {};
  readonly restPos: Record<string, THREE.Vector3> = {};
  skeleton!: THREE.Skeleton;
  base!: THREE.SkinnedMesh;
  fur!: THREE.SkinnedMesh;
  readonly uniforms: FurUniforms;
  readonly eyes: EyeRig[] = [];
  tongue!: THREE.Mesh;
  tongueRest = new THREE.Vector3();
  readonly contacts: ContactPoint[] = [];
  readonly design: CatDesign;
  readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];
  private accessoryGroup: THREE.Group | null = null;
  readonly coat: CatCoatDef;
  buildMs = 0;

  constructor(readonly breed: CatBreed, opts: CatModelOptions = {}) {
    const t0 = performance.now();
    const q = opts.quality ?? 0.9;
    this.coat = breed.coat;
    this.design = designCat(breed);
    this.uniforms = makeFurUniforms();
    this.buildSkeleton();
    this.buildSkin(q);
    this.buildEyes();
    this.buildTongue();
    this.buildWhiskers();
    this.setAccessory(opts.accessory ?? 'ribbon_rose');
    for (const c of this.design.contacts) {
      const b = this.bones[c.bone]!;
      const wp = this.boneWorldRest(c.bone);
      this.contacts.push({
        bone: b,
        local: new THREE.Vector3(c.pos[0] - wp.x, c.pos[1] - wp.y, c.pos[2] - wp.z),
        name: c.name,
      });
    }
    this.buildMs = performance.now() - t0;
  }

  boneWorldRest(name: string): THREE.Vector3 {
    const def = this.design.bones.find((b) => b.name === name)!;
    return new THREE.Vector3(...def.pos);
  }

  private buildSkeleton() {
    for (const def of this.design.bones) {
      const b = new THREE.Bone();
      b.name = def.name;
      this.bones[def.name] = b;
    }
    for (const def of this.design.bones) {
      const b = this.bones[def.name]!;
      if (def.parent) {
        const p = this.design.bones.find((x) => x.name === def.parent)!;
        b.position.set(def.pos[0] - p.pos[0], def.pos[1] - p.pos[1], def.pos[2] - p.pos[2]);
        this.bones[def.parent]!.add(b);
      } else {
        b.position.set(def.pos[0], def.pos[1], def.pos[2]);
        this.root.add(b);
      }
      this.restPos[def.name] = b.position.clone();
    }
    this.root.updateMatrixWorld(true);
    const list = this.design.bones.map((d) => this.bones[d.name]!);
    this.skeleton = new THREE.Skeleton(list);
  }

  private buildSkin(quality: number) {
    const d = this.design;
    const vox = d.dims.voxel / Math.sqrt(quality);
    const earVox = Math.min(vox * 0.62, this.breed.shape.ear.T * d.dims.hs * 0.42);
    const comps: Component[] = [
      { prims: d.body, voxel: vox, name: 'body' },
      { prims: d.jaw, voxel: vox * 0.72, name: 'jaw' },
      { prims: d.ears[0]!, voxel: earVox, name: 'earL' },
      { prims: d.ears[1]!, voxel: earVox, name: 'earR' },
    ];
    const allPrims = [d.body, d.jaw];
    const aoField = (x: number, y: number, z: number) => {
      let m = 1e3;
      for (const p of allPrims) m = Math.min(m, evalField(p, x, y, z));
      return m;
    };

    const boneIndex: Record<string, number> = {};
    d.bones.forEach((b, i) => (boneIndex[b.name] = i));

    const pos: number[] = [], nrm: number[] = [], col: number[] = [], skI: number[] = [], skW: number[] = [];
    const furData: number[] = [], furDir: number[] = [], idx: number[] = [];
    const tailPts = [0, 1, 2, 3, 4].map((i) => d.bones.find((b) => b.name === 'tail' + i)!.pos).concat([d.dims.tailTip]);
    const furLen = this.breed.fur.len;
    const eyeInfo = d.eyes;
    const A = d.dims.atlas;
    const hs = d.dims.hs;
    const aoStep = 0.005 * Math.max(0.5, d.dims.g);

    const lidAcc = [new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0)];
    const lidCnt = [0, 0];

    for (const comp of comps) {
      const grid = sampleGrid(comp.prims, comp.voxel);
      const raw = surfaceNets(grid, comp.prims, 2);
      const base = pos.length / 3;
      const vcount = raw.positions.length / 3;
      const weighed = comp.prims.filter((p) => p.weigh);
      const dists = new Float64Array(weighed.length);
      const sigma = comp.name === 'body' ? 0.009 * Math.max(0.55, d.dims.g) : 0.004 * hs;
      const tagSigma = 0.0028 * hs;

      for (let v = 0; v < vcount; v++) {
        const x = raw.positions[v * 3]!, y = raw.positions[v * 3 + 1]!, z = raw.positions[v * 3 + 2]!;
        const nx = raw.normals[v * 3]!, ny = raw.normals[v * 3 + 1]!, nz = raw.normals[v * 3 + 2]!;
        let dmin = Infinity;
        for (let i = 0; i < weighed.length; i++) {
          const p = weighed[i]!;
          const m = p.k + sigma * 6;
          if (
            x < p.min[0] - m || y < p.min[1] - m || z < p.min[2] - m ||
            x > p.max[0] + m || y > p.max[1] + m || z > p.max[2] + m
          ) {
            dists[i] = Infinity;
            continue;
          }
          const dd = p.d(x, y, z);
          dists[i] = dd;
          if (dd < dmin) dmin = dd;
        }
        const bw: Record<string, number> = {};
        const tags: Record<string, number> = {};
        let fx = 0, fy = 0, fz = 0, tsum = 0;
        for (let i = 0; i < weighed.length; i++) {
          const dv = dists[i]!;
          if (dv === Infinity) continue;
          const p = weighed[i]!;
          const tw = Math.exp(-(dv - dmin) / tagSigma);
          if (tw > 0.01) { tags[p.tag] = (tags[p.tag] || 0) + tw; tsum += tw; }
          const w = Math.exp(-(dv - dmin) / sigma);
          if (w < 0.01) continue;
          const f = typeof p.flow === 'function' ? p.flow(x, y, z) : p.flow;
          fx += f[0] * w; fy += f[1] * w; fz += f[2] * w;
          if (typeof p.bone === 'string') bw[p.bone] = (bw[p.bone] || 0) + w;
          else {
            const list = typeof p.bone === 'function' ? p.bone(x, y, z) : p.bone;
            for (const [bn, bwv] of list) if (bwv > 0) bw[bn] = (bw[bn] || 0) + w * bwv;
          }
        }
        for (const k in tags) tags[k] = (tags[k] ?? 0) / (tsum || 1);
        const sorted = Object.entries(bw).sort((a, b) => b[1] - a[1]).slice(0, 4);
        let tot = 0;
        for (const [, w] of sorted) tot += w;
        for (let i = 0; i < 4; i++) {
          const e = sorted[i];
          skI.push(e ? (boneIndex[e[0]] ?? 0) : 0);
          skW.push(e && tot > 0 ? e[1] / tot : 0);
        }

        const dn = fx * nx + fy * ny + fz * nz;
        let tx = fx - nx * dn, ty = fy - ny * dn, tz = fz - nz * dn;
        let tl = Math.hypot(tx, ty, tz);
        if (tl < 1e-4) {
          tx = 0; ty = -1; tz = 0;
          const d2 = -ny;
          tx -= nx * d2; ty -= ny * d2; tz -= nz * d2;
          tl = Math.hypot(tx, ty, tz) || 1;
        }
        furDir.push(tx / tl, ty / tl, tz / tl);

        let occ = 0;
        for (let i = 1; i <= 4; i++) {
          const dist = aoStep * i;
          const f = aoField(x + nx * dist, y + ny * dist, z + nz * dist);
          occ += Math.max(0, dist - f) / dist / (1 << (i - 1));
        }
        const ao = Math.min(1, Math.max(0.5, 1 - occ * 0.48));

        let eyeD = Infinity;
        for (const e of eyeInfo.pos) eyeD = Math.min(eyeD, Math.hypot(x - e[0], y - e[1], z - e[2]) / eyeInfo.r);

        let tailF = 0;
        if (tags.tail) {
          let best = Infinity;
          for (let i = 0; i < 5; i++) {
            const a = tailPts[i]!, b = tailPts[i + 1]!;
            const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
            const l2 = Math.max(1e-6, abx * abx + aby * aby + abz * abz);
            const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (y - a[1]) * aby + (z - a[2]) * abz) / l2));
            const dd = Math.hypot(x - a[0] - abx * t, y - a[1] - aby * t, z - a[2] - abz * t);
            if (dd < best) { best = dd; tailF = (i + t) / 5; }
          }
        }

        const paint = paintCatVertex(
          {
            p: [x, y, z], n: [nx, ny, nz], tags, design: d,
            hx: (x - A[0]!) / hs, hy: (y - A[1]!) / hs, hz: (z - A[2]!) / hs,
            u: (z - d.dims.hipZ) / (d.dims.shZ - d.dims.hipZ), eyeD, tailF,
          },
          this.coat,
          d.furRegions,
        );

        if (comp.name === 'body' && eyeD > 1.35 && eyeD < 2.5) {
          for (let e = 0; e < 2; e++) {
            const ep = eyeInfo.pos[e]!;
            if (Math.hypot(x - ep[0], y - ep[1], z - ep[2]) / eyeInfo.r < 2.5 && y > ep[1]) {
              const acc = lidAcc[e]!;
              acc.r += paint.color.r; acc.g += paint.color.g; acc.b += paint.color.b;
              lidCnt[e] = (lidCnt[e] ?? 0) + 1;
            }
          }
        }

        let furMul = paint.fur;
        if (comp.name === 'earL' || comp.name === 'earR') {
          const en = d.earNormals[comp.name === 'earL' ? 0 : 1]!;
          const k = Math.abs(nx * en[0] + ny * en[1] + nz * en[2]);
          furMul *= 0.15 + 0.85 * Math.min(1, Math.max(0, (k - 0.25) / 0.5));
        }
        pos.push(x, y, z);
        nrm.push(nx, ny, nz);
        col.push(paint.color.r, paint.color.g, paint.color.b);
        furData.push(furLen * furMul, paint.gloss, ao, 0);
      }
      for (let i = 0; i < raw.indices.length; i++) idx.push(raw.indices[i]! + base);
    }
    this.lidColors = lidAcc.map((c, i) => (lidCnt[i] ? c.multiplyScalar(1 / lidCnt[i]) : new THREE.Color(0.85, 0.52, 0.25)));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skI, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skW, 4));
    geo.setAttribute('furData', new THREE.Float32BufferAttribute(furData, 4));
    geo.setAttribute('furDir', new THREE.Float32BufferAttribute(furDir, 3));
    geo.setIndex(new THREE.Uint32BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    this.vertexCount = pos.length / 3;
    this.triangleCount = idx.length / 3;

    const fur = this.breed.fur;
    const u = this.uniforms;
    const shells = Math.max(5, Math.round(fur.shells * Math.min(1.1, quality)));
    u.uShellCount.value = shells;
    u.uDensity.value = fur.density;
    u.uComb.value = fur.comb;
    u.uClump.value = fur.clump;
    u.uShadowPush.value = 0.008 + fur.len * 1.2 + 0.006 * Math.max(0.5, d.dims.g);

    const baseMat = makeFurMaterial(u, false);
    const shellMat = makeFurMaterial(u, true);
    this.materials.push(baseMat, shellMat);

    this.base = new THREE.SkinnedMesh(geo, baseMat);
    this.base.castShadow = true;
    this.base.receiveShadow = true;
    this.base.frustumCulled = false;

    const ig = new THREE.InstancedBufferGeometry();
    ig.index = geo.index;
    for (const [k, a] of Object.entries(geo.attributes)) ig.setAttribute(k, a);
    ig.instanceCount = shells;
    ig.boundingSphere = geo.boundingSphere!.clone();
    this.fur = new THREE.SkinnedMesh(ig as unknown as THREE.BufferGeometry, shellMat);
    this.fur.receiveShadow = true;
    this.fur.castShadow = false;
    this.fur.frustumCulled = false;
    this.fur.renderOrder = 1;

    this.root.add(this.base, this.fur);
    this.root.updateMatrixWorld(true);
    this.base.bind(this.skeleton, this.base.matrixWorld);
    this.fur.bind(this.skeleton, this.fur.matrixWorld);
    this.geometry = geo;
  }

  geometry!: THREE.BufferGeometry;
  vertexCount = 0;
  triangleCount = 0;
  lidColors: THREE.Color[] = [];

  private buildEyes() {
    const d = this.design;
    const tex = makeFelineEyeTexture(this.coat.eye);
    this.textures.push(tex);
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5,
    });
    this.materials.push(mat);
    const r = d.eyes.r;
    const geo = new THREE.SphereGeometry(r, 32, 22);
    geo.rotateX(Math.PI / 2);
    const head = this.bones.head!;
    const headPos = this.boneWorldRest('head');
    for (let i = 0; i < 2; i++) {
      const p = d.eyes.pos[i]!;
      const dir = new THREE.Vector3(...d.eyes.dir[i]!);
      const pivot = new THREE.Object3D();
      pivot.position.set(p[0] - headPos.x, p[1] - headPos.y, p[2] - headPos.z);
      pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      head.add(pivot);
      const ball = new THREE.Mesh(geo, mat);
      pivot.add(ball);

      const lidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
      this.materials.push(lidMat);
      const upper = new THREE.Object3D();
      const lower = new THREE.Object3D();
      upper.add(new THREE.Mesh(makeLidGeometry(r * 1.08, true, this.lidColors[i]!), lidMat));
      lower.add(new THREE.Mesh(makeLidGeometry(r * 1.07, false, this.lidColors[i]!), lidMat));
      pivot.add(upper, lower);
      this.eyes.push({ pivot, ball, lidUpper: upper, lidLower: lower, restDir: dir });
    }
    this.setLids(0, 0);
  }

  setLids(close: number, squint: number) {
    for (const e of this.eyes) {
      e.lidUpper.rotation.x = THREE.MathUtils.lerp(-0.98, 0.24, close);
      e.lidLower.rotation.x = THREE.MathUtils.lerp(1.16, 0.02, Math.max(close * 0.6, squint));
    }
  }

  private buildTongue() {
    const d = this.design;
    const geo = new THREE.SphereGeometry(1, 20, 12);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      let y = p.getY(i);
      if (y > 0) y *= 1 - 0.45 * Math.exp(-(x * x) / 0.025);
      if (y < 0) y *= 0.55;
      p.setXYZ(i, x, y, p.getZ(i));
    }
    geo.computeVertexNormals();
    geo.scale(d.tongue.r[0], d.tongue.r[1], d.tongue.r[2]);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xee7b8a, roughness: 0.35, clearcoat: 0.65, clearcoatRoughness: 0.18 });
    this.materials.push(mat);
    this.tongue = new THREE.Mesh(geo, mat);
    const jp = this.boneWorldRest('jaw');
    this.tongue.position.set(d.tongue.pos[0] - jp.x, d.tongue.pos[1] - jp.y, d.tongue.pos[2] - jp.z);
    this.tongueRest.copy(this.tongue.position);
    this.bones.jaw!.add(this.tongue);
  }

  private buildWhiskers() {
    const headPos = this.boneWorldRest('head');
    const mat = new THREE.MeshStandardMaterial({ color: '#fff8ef', roughness: 0.4 });
    this.materials.push(mat);
    for (const anchor of this.design.whiskerAnchors) {
      const baseX = anchor.pos[0] - headPos.x;
      const baseY = anchor.pos[1] - headPos.y;
      const baseZ = anchor.pos[2] - headPos.z;
      const s = anchor.side;
      for (const [dy, dz, pitch, yaw] of [
        [0.0025, 0.001, 0.12, -0.15],
        [0, 0.002, 0.0, -0.04],
        [-0.0025, 0.001, -0.14, 0.08],
      ] as const) {
        const len = 0.046;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(s * len * 0.52, dy * 2.5, 0.004),
          new THREE.Vector3(s * len, dy * 1.2 - 0.005, -0.008),
        );
        const geo = new THREE.TubeGeometry(curve, 6, 0.00055, 4, false);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(baseX + s * 0.004, baseY + dy, baseZ + dz);
        mesh.rotation.set(pitch, yaw * s, 0);
        this.bones.head!.add(mesh);
      }
    }
  }

  setAccessory(accessory: CatAccessoryId) {
    if (this.accessoryGroup) {
      this.accessoryGroup.removeFromParent();
      this.accessoryGroup.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
      });
      this.accessoryGroup = null;
    }
    if (accessory === 'none') return;
    const spec = CAT_ACCESSORIES.find((a) => a.id === accessory) ?? CAT_ACCESSORIES[1]!;
    const g = new THREE.Group();
    const neckPos = this.boneWorldRest('neck');
    const headPos = this.boneWorldRest('head');
    const center = neckPos.clone().lerp(headPos, 0.42).sub(neckPos);
    g.position.copy(center);

    const R = this.design.dims.neckRadius * 1.06;
    const bandMat = new THREE.MeshPhysicalMaterial({ color: spec.color, roughness: 0.4, clearcoat: 0.3 });
    const accentMat = new THREE.MeshPhysicalMaterial({ color: spec.accent, roughness: 0.3, metalness: accessory === 'bell_gold' ? 0.85 : 0.1 });
    this.materials.push(bandMat, accentMat);

    const band = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0045, 8, 28), bandMat);
    band.rotation.x = Math.PI / 2 + 0.35;
    band.scale.set(1, 0.88, 1);
    g.add(band);

    if (accessory === 'ribbon_rose') {
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), bandMat);
        wing.scale.set(1.25, 0.72, 0.45);
        wing.position.set(s * 0.012, -0.01, R * 0.92);
        wing.rotation.z = s * 0.25;
        g.add(wing);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), accentMat);
      knot.position.set(0, -0.01, R * 0.95);
      g.add(knot);
    } else if (accessory === 'bell_gold') {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 12, 10), accentMat);
      bell.position.set(0, -0.016, R * 0.94);
      g.add(bell);
    } else if (accessory === 'scarf_mint') {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.005), accentMat);
      tail.position.set(0.008, -0.022, R * 0.9);
      tail.rotation.set(-0.2, 0, -0.22);
      g.add(tail);
    }

    this.bones.neck!.add(g);
    this.accessoryGroup = g;
  }

  lowestContact(names?: string[]): number {
    let m = Infinity;
    this.root.updateMatrixWorld(true);
    const inv = tmpM.copy(this.root.matrixWorld).invert();
    for (const c of this.contacts) {
      if (names && !names.includes(c.name)) continue;
      tmpV.copy(c.local).applyMatrix4(c.bone.matrixWorld).applyMatrix4(inv);
      if (tmpV.y < m) m = tmpV.y;
    }
    return m;
  }

  dispose() {
    this.geometry.dispose();
    this.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry && mesh.geometry !== this.geometry) mesh.geometry.dispose();
    });
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    this.skeleton.dispose();
  }
}

function makeLidGeometry(r: number, upper: boolean, coat: THREE.Color): THREE.BufferGeometry {
  const geo = upper
    ? new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    : new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const rim = new THREE.Color('#281b18');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = Math.abs(p.getY(i)) / r;
    c.copy(rim).lerp(coat, Math.min(1, Math.max(0, (y - 0.08) / 0.2)));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

export function makeFelineEyeTexture(iris: string): THREE.CanvasTexture {
  const W = 256, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const ic = new THREE.Color(iris);
  const ir = Math.round(Math.pow(ic.r, 1 / 2.2) * 255);
  const ig = Math.round(Math.pow(ic.g, 1 / 2.2) * 255);
  const ib = Math.round(Math.pow(ic.b, 1 / 2.2) * 255);

  // Spherical coordinates: th = 0 at gaze center, irisEdge around 0.92
  const irisEdge = 0.94;
  for (let y = 0; y < H; y++) {
    const th = ((y + 0.5) / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const ang = (x / W) * Math.PI * 2;
      // Project onto tangent disk around gaze axis for vertical feline slit pupil
      const px = Math.sin(th) * Math.cos(ang);
      const py = Math.sin(th) * Math.sin(ang);
      const slitDist = Math.hypot(px / 0.145, py / 0.44);
      let r: number;
      let g: number;
      let b: number;
      if (th < Math.PI * 0.5 && slitDist < 1) {
        r = g = b = 8;
        // Soft glossy catchlight sparkle on upper-right edge
        if (Math.hypot(px - 0.11, py - 0.18) < 0.085) { r = g = b = 248; }
      } else if (th < irisEdge) {
        const f = Math.min(1, (th - 0.18) / (irisEdge - 0.18));
        const streak = 0.8 + 0.2 * Math.sin(ang * 32 + Math.sin(ang * 9) * 1.5);
        const ring = 1.18 - 0.35 * Math.pow(f, 2.0);
        const k = streak * ring;
        r = ir * k; g = ig * k; b = ib * k;
        if (Math.hypot(px - 0.13, py - 0.2) < 0.09) {
          r = 250; g = 248; b = 244;
        }
      } else {
        const f = Math.min(1, (th - irisEdge) / 0.24);
        r = 26 + 50 * f; g = 18 + 38 * f; b = 15 + 32 * f;
      }
      const o = (y * W + x) * 4;
      img.data[o] = Math.min(255, Math.max(0, r));
      img.data[o + 1] = Math.min(255, Math.max(0, g));
      img.data[o + 2] = Math.min(255, Math.max(0, b));
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
