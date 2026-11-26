import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CatRegion } from '../../../donors/nintendogs-cat-v2/catActor';
import { wrapAngle } from '../../../donors/nintendogs-cat-v2/catActor';
import { CAT_ACCESSORIES, type CatAccessoryId, type CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';
import { CatAnimationAdapter } from './CatAnimationAdapter';
import type {
  BoundsRect,
  CatHit,
  CatLodLevel,
  CatModelDebugInfo,
  IPetCareCatActor,
  MoveOpts,
  TaggedCircle,
} from './petCareActorTypes';

export const VUENA_CAT_GLB_URL = '/assets/pet-care-v2/models/vuena-cat.glb';

const VUENA_CAT_SCALE = 0.66;

interface BoneCapsule {
  a: THREE.Object3D;
  b: THREE.Object3D | null;
  aOff: THREE.Vector3;
  bOff: THREE.Vector3;
  r: number;
  region: CatRegion;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

function collectTexturesFromMaterial(mat: THREE.Material, out: Set<THREE.Texture>): void {
  const rec = mat as unknown as Record<string, unknown>;
  for (const key of [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'aoMap',
    'emissiveMap',
    'alphaMap',
  ]) {
    const val = rec[key];
    if (val instanceof THREE.Texture) {
      out.add(val);
    }
  }
}

export class CatGltfActor implements IPetCareCatActor {
  readonly group = new THREE.Group();
  readonly rig: CatAnimationAdapter;

  heading = 0;
  speed = 0;
  maxSpeed = 0.65;
  bounds: BoundsRect | null = null;
  obstacles: TaggedCircle[] = [];
  floorY = 0;
  ignoreObstacleTag: string | null = null;
  jump: { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; h: number; onLand?: () => void } | null = null;

  private lastHeading = 0;
  private turnSmooth = 0;
  private target: THREE.Vector3 | null = null;
  private moveOpts: MoveOpts = {};
  private faceTarget: THREE.Vector3 | null = null;

  private readonly animRoot: THREE.Object3D;
  private readonly bones: Record<string, THREE.Bone> = {};
  private readonly capsules: BoneCapsule[] = [];
  private lod0Mesh: THREE.Mesh | null = null;
  private lod1Mesh: THREE.Mesh | null = null;
  private lod: CatLodLevel = 'lod0';
  private accessoryGroup: THREE.Group | null = null;
  private readonly bodyMaterials: THREE.MeshStandardMaterial[] = [];

  private constructor(
    rootObj: THREE.Object3D,
    clips: THREE.AnimationClip[],
    opts: { variant: CatCoatVariantId; accessory: CatAccessoryId; lod: CatLodLevel },
  ) {
    this.animRoot = rootObj;
    this.animRoot.scale.setScalar(VUENA_CAT_SCALE);
    this.group.add(this.animRoot);
    this.group.userData.actor = this;
    this.lod = opts.lod;

    rootObj.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        this.bones[obj.name] = obj as THREE.Bone;
      }
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        if (obj.name === 'cat_LOD0') this.lod0Mesh = mesh;
        if (obj.name === 'cat_LOD1') this.lod1Mesh = mesh;

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m instanceof THREE.MeshStandardMaterial && !this.bodyMaterials.includes(m)) {
            this.bodyMaterials.push(m);
          }
        }
      }
    });

    this.rig = new CatAnimationAdapter(this.group, this.animRoot, clips, this.bones);
    this.setLod(opts.lod);
    this.setCoatVariant(opts.variant);
    this.setAccessory(opts.accessory);
    this.buildHitCapsules();
  }

  static async load(
    url = VUENA_CAT_GLB_URL,
    opts: { variant?: CatCoatVariantId; accessory?: CatAccessoryId; lod?: CatLodLevel } = {},
  ): Promise<CatGltfActor> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    return new CatGltfActor(gltf.scene, gltf.animations ?? [], {
      variant: opts.variant ?? 'ginger-tabby',
      accessory: opts.accessory ?? 'ribbon_rose',
      lod: opts.lod ?? 'lod0',
    });
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  get moving(): boolean {
    return Boolean(this.target);
  }

  get size(): number {
    return 0.34;
  }

  place(x: number, z: number, heading = this.heading): void {
    this.group.position.set(x, this.floorY, z);
    this.heading = heading;
    this.lastHeading = heading;
    this.turnSmooth = 0;
    this.group.rotation.y = heading;
  }

  goTo(p: THREE.Vector3, opts: MoveOpts = {}): void {
    this.target = (this.target || new THREE.Vector3()).copy(p);
    this.target.y = this.floorY;
    this.moveOpts = opts;
  }

  stop(): void {
    this.target = null;
  }

  face(p: THREE.Vector3 | null): void {
    this.faceTarget = p ? (this.faceTarget || new THREE.Vector3()).copy(p) : null;
  }

  headingTo(p: THREE.Vector3): number {
    return Math.atan2(p.x - this.position.x, p.z - this.position.z);
  }

  distanceTo(p: THREE.Vector3): number {
    return Math.hypot(p.x - this.position.x, p.z - this.position.z);
  }

  jumpTo(to: THREE.Vector3, height: number, dur: number, onLand?: () => void): void {
    this.jump = { from: this.position.clone(), to: to.clone(), t: 0, dur, h: height, onLand };
    this.heading = this.headingTo(to);
    this.rig.setPose('jump', 14);
  }

  update(dt: number): void {
    const rig = this.rig;
    if (this.jump) {
      const j = this.jump;
      j.t += dt;
      const f = Math.min(1, j.t / j.dur);
      this.position.lerpVectors(j.from, j.to, f);
      this.position.y = this.floorY;
      this.collide();
      rig.rootLift = 4 * j.h * f * (1 - f);
      rig.speed = 0;
      if (f >= 1) {
        rig.rootLift = 0;
        this.jump = null;
        rig.setPose('stand', 10);
        j.onLand?.();
      }
    } else if (this.target) {
      const dx = this.target.x - this.position.x;
      const dz = this.target.z - this.position.z;
      const dist = Math.hypot(dx, dz);
      const arrive = this.moveOpts.arrive ?? 0.06;
      if (dist <= arrive) {
        const opts = this.moveOpts;
        this.target = null;
        if (opts.faceAfter) this.face(opts.faceAfter);
        opts.onArrive?.();
      } else {
        const want = Math.atan2(dx, dz);
        const diff = wrapAngle(want - this.heading);
        const maxTurn = (this.speed > 0.6 ? 5.4 : 4.0) * dt;
        const turn = THREE.MathUtils.clamp(diff, -maxTurn, maxTurn);
        this.heading += turn;
        const top = this.moveOpts.speed ?? this.maxSpeed;
        let desired = Math.min(top, Math.max(0.14, dist * 2.2));
        desired *= THREE.MathUtils.clamp(Math.cos(diff) * 1.15, 0.2, 1);
        const acc = desired > this.speed ? 2.8 : 4.4;
        this.speed += THREE.MathUtils.clamp(desired - this.speed, -acc * dt, acc * dt);
      }
    }

    if (!this.target && !this.jump) {
      this.speed = Math.max(0, this.speed - 3.4 * dt);
      if (this.faceTarget) {
        const want = this.headingTo(this.faceTarget);
        const diff = wrapAngle(want - this.heading);
        const maxTurn = 3.6 * dt;
        const turn = THREE.MathUtils.clamp(diff, -maxTurn, maxTurn);
        this.heading += turn;
        if (Math.abs(diff) < 0.05) this.faceTarget = null;
      }
    }

    if (this.speed > 0 && !this.jump) {
      this.position.x += Math.sin(this.heading) * this.speed * dt;
      this.position.z += Math.cos(this.heading) * this.speed * dt;
      this.collide();
    }
    this.position.y = this.floorY;
    this.group.rotation.y = this.heading;

    const measured = wrapAngle(this.heading - this.lastHeading) / Math.max(dt, 1e-4);
    this.lastHeading = this.heading;
    this.turnSmooth += (THREE.MathUtils.clamp(measured, -8, 8) - this.turnSmooth) * (1 - Math.exp(-12 * dt));
    rig.speed = this.jump ? 0 : this.speed;
    rig.turnRate = this.jump ? 0 : this.turnSmooth;
    rig.update(dt);
  }

  private collide(): void {
    const r = 0.145;
    for (const o of this.obstacles) {
      if (this.ignoreObstacleTag && o.tag === this.ignoreObstacleTag) continue;
      const dx = this.position.x - o.x;
      const dz = this.position.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + r;
      if (d < min && d > 1e-4) {
        this.position.x = o.x + (dx / d) * min;
        this.position.z = o.z + (dz / d) * min;
      }
    }
    const b = this.bounds;
    if (b) {
      this.position.x = THREE.MathUtils.clamp(this.position.x, b.minX + r, b.maxX - r);
      this.position.z = THREE.MathUtils.clamp(this.position.z, b.minZ + r, b.maxZ - r);
    }
  }

  randomPoint(radius = 1.4, around?: THREE.Vector3): THREE.Vector3 {
    const c = around || this.position;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * radius;
      const p = new THREE.Vector3(c.x + Math.cos(a) * d, this.floorY, c.z + Math.sin(a) * d);
      if (this.bounds) {
        const b = this.bounds;
        const m = 0.24;
        if (p.x < b.minX + m || p.x > b.maxX - m || p.z < b.minZ + m || p.z > b.maxZ - m) continue;
      }
      if (this.obstacles.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < o.r + 0.2)) continue;
      return p;
    }
    return c.clone();
  }

  headWorld(out = new THREE.Vector3()): THREE.Vector3 {
    const bone = this.bones.Head ?? this.bones.Neck ?? this.group;
    bone.getWorldPosition(out);
    if (bone === this.bones.Head) {
      out.y += 0.04;
    }
    return out;
  }

  frontPawWorld(side: 'L' | 'R' = 'L', out = new THREE.Vector3()): THREE.Vector3 {
    const bone = this.bones[`FrontLowerLeg_${side}`] ?? this.bones[`FrontUpperLeg_${side}`] ?? this.group;
    bone.getWorldPosition(out);
    out.y = Math.max(this.floorY + 0.025, out.y - 0.02);
    return out;
  }

  setLod(lod: CatLodLevel): void {
    this.lod = lod;
    if (this.lod0Mesh) this.lod0Mesh.visible = lod === 'lod0' || !this.lod1Mesh;
    if (this.lod1Mesh) this.lod1Mesh.visible = lod === 'lod1';
  }

  setCoatVariant(variant: CatCoatVariantId): void {
    const tint = variant === 'cream-puff' ? '#fff0da' : variant === 'calico-patch' ? '#f5e6d8' : '#ffffff';
    for (const m of this.bodyMaterials) {
      m.color.set(tint);
    }
  }

  setCoatAppearance(opts: { fluff?: number; dirt?: number; comb?: number }): void {
    // Adjust subtle coat sheen cleanly without mutating Vuena's painted orange tabby texture
    if (typeof opts.fluff === 'number') {
      const roughness = THREE.MathUtils.lerp(0.86, 0.56, THREE.MathUtils.clamp((opts.fluff - 0.45) / 0.5, 0, 1));
      for (const m of this.bodyMaterials) {
        m.roughness = roughness;
      }
    }
  }

  setAccessory(accessory: CatAccessoryId): void {
    if (this.accessoryGroup) {
      this.accessoryGroup.removeFromParent();
      this.accessoryGroup.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
          else mesh.material.dispose();
        }
      });
      this.accessoryGroup = null;
    }
    if (accessory === 'none') return;

    const parentBone = this.bones.Neck ?? this.bones.Spine ?? this.group;
    const acc = new THREE.Group();
    const spec = CAT_ACCESSORIES.find((a) => a.id === accessory);
    const color = spec?.color || '#e75a70';

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.084, 0.011, 10, 24),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 }),
    );
    collar.rotation.x = Math.PI * 0.42;
    collar.position.set(0, 0.014, 0.012);
    acc.add(collar);

    if (accessory === 'bell_gold') {
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 10),
        new THREE.MeshStandardMaterial({ color: '#ffd44d', roughness: 0.22, metalness: 0.78 }),
      );
      bell.position.set(0, -0.02, 0.092);
      acc.add(bell);
    } else if (accessory === 'ribbon_rose') {
      const bowMat = new THREE.MeshStandardMaterial({ color: '#ff7fa6', roughness: 0.5 });
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.036, 6), bowMat);
        wing.rotation.z = s * Math.PI * 0.5;
        wing.position.set(s * 0.02, -0.01, 0.092);
        acc.add(wing);
      }
    } else if (accessory === 'scarf_mint') {
      const tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, 0.082, 0.016),
        new THREE.MeshStandardMaterial({ color: '#69c9b4', roughness: 0.75 }),
      );
      tail.rotation.x = -0.22;
      tail.position.set(0.018, -0.038, 0.086);
      acc.add(tail);
    }

    parentBone.add(acc);
    this.accessoryGroup = acc;
  }

  private buildHitCapsules(): void {
    const add = (aName: string, bName: string | null, aOff: [number, number, number], bOff: [number, number, number], r: number, region: CatRegion) => {
      const a = this.bones[aName];
      if (!a) return;
      const b = bName ? (this.bones[bName] ?? null) : null;
      this.capsules.push({
        a,
        b,
        aOff: new THREE.Vector3(...aOff),
        bOff: new THREE.Vector3(...bOff),
        r,
        region,
      });
    };

    add('Head', null, [0, 0.05, 0.02], [0, 0.09, 0.02], 0.145, 'head');
    add('Jaw', 'Head', [0, 0, 0.05], [0, -0.01, 0.07], 0.07, 'chin');
    add('Ear_L', null, [0, 0.02, 0], [0, 0.07, 0], 0.055, 'ear');
    add('Ear_R', null, [0, 0.02, 0], [0, 0.07, 0], 0.055, 'ear');
    add('Hips', 'Spine', [0, 0.02, 0], [0, 0.02, 0.02], 0.115, 'back');
    add('Spine', 'Neck', [0, 0.01, 0], [0, 0, 0], 0.105, 'chest');
    add('Hips', null, [0, 0.01, -0.04], [0, 0.02, 0], 0.1, 'rump');
    add('Tail_1', 'Tail_2', [0, 0, 0], [0, 0.04, 0], 0.055, 'tail');
    add('FrontUpperLeg_L', 'FrontLowerLeg_L', [0, 0, 0], [0, 0, 0], 0.05, 'frontPaw');
    add('FrontUpperLeg_R', 'FrontLowerLeg_R', [0, 0, 0], [0, 0, 0], 0.05, 'frontPaw');
    add('BackUpperLeg_L', 'BackLowerLeg_L', [0, 0, 0], [0, 0, 0], 0.05, 'hindPaw');
    add('BackUpperLeg_R', 'BackLowerLeg_R', [0, 0, 0], [0, 0, 0], 0.05, 'hindPaw');
  }

  raycast(ray: THREE.Ray): CatHit | null {
    let best: CatHit | null = null;
    const up = new THREE.Vector3(0, 1, 0);
    for (const c of this.capsules) {
      c.a.updateWorldMatrix(true, false);
      _a.copy(c.aOff).applyMatrix4(c.a.matrixWorld);
      if (c.b) {
        c.b.updateWorldMatrix(true, false);
        _b.copy(c.bOff).applyMatrix4(c.b.matrixWorld);
      } else {
        _b.copy(_a).add(_w.set(0, 1e-4, 0));
      }
      const t = rayCapsule(ray, _a, _b, c.r);
      if (t === null || (best && t >= best.distance)) continue;
      const point = ray.at(t, new THREE.Vector3());
      const ab = _w.copy(_b).sub(_a);
      const u = THREE.MathUtils.clamp(point.clone().sub(_a).dot(ab) / Math.max(ab.lengthSq(), 1e-9), 0, 1);
      const cp = _a.clone().addScaledVector(ab, u);
      const normal = point.clone().sub(cp).normalize();
      let region = c.region;
      if (region === 'back') {
        const k = normal.dot(up);
        region = k > 0.3 ? 'back' : k < -0.2 ? 'belly' : 'side';
      }
      best = { point, normal, region, distance: t, bone: c.a };
    }
    return best;
  }

  getModelDebugInfo(): CatModelDebugInfo {
    const activeMesh = this.lod === 'lod1' && this.lod1Mesh ? this.lod1Mesh : this.lod0Mesh;
    const tris = activeMesh?.geometry.index
      ? activeMesh.geometry.index.count / 3
      : (activeMesh?.geometry.getAttribute('position')?.count ?? 0) / 3;
    return {
      modelKind: 'vuena-glb',
      lod: this.lod,
      activeClip: this.rig.activeClip,
      clipNames: this.rig.availableClips,
      triangles: Math.round(tris),
    };
  }

  dispose(): void {
    this.rig.dispose();
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    const texs = new Set<THREE.Texture>();
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) geos.add(mesh.geometry);
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          for (const m of mesh.material) {
            mats.add(m);
            collectTexturesFromMaterial(m, texs);
          }
        } else {
          mats.add(mesh.material);
          collectTexturesFromMaterial(mesh.material, texs);
        }
      }
    });
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    for (const t of texs) t.dispose();
  }
}

function rayCapsule(ray: THREE.Ray, a: THREE.Vector3, b: THREE.Vector3, r: number): number | null {
  const ro = ray.origin;
  const rd = ray.direction;
  const ba = _v.copy(b).sub(a);
  const oa = new THREE.Vector3().copy(ro).sub(a);
  const baba = ba.dot(ba);
  const bard = ba.dot(rd);
  const baoa = ba.dot(oa);
  const rdoa = rd.dot(oa);
  const oaoa = oa.dot(oa);
  const aa = baba - bard * bard;
  let bb = baba * rdoa - baoa * bard;
  let cc = baba * oaoa - baoa * baoa - r * r * baba;
  let h = bb * bb - aa * cc;
  if (h >= 0) {
    const t = (-bb - Math.sqrt(h)) / Math.max(1e-8, aa);
    const y = baoa + t * bard;
    if (y > 0 && y < baba && t > 0) return t;
    const oc = y <= 0 ? oa : new THREE.Vector3().copy(ro).sub(b);
    bb = rd.dot(oc);
    cc = oc.dot(oc) - r * r;
    h = bb * bb - cc;
    if (h > 0) {
      const t2 = -bb - Math.sqrt(h);
      if (t2 > 0) return t2;
    }
  }
  return null;
}
