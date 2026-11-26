// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/game/toyPhysics.ts
import * as THREE from 'three';
import type { Bounds, Circle } from './catActor';

export type ToyKind = 'ball' | 'yarn' | 'wand' | 'box';

export interface ToyProp {
  kind: ToyKind;
  object: THREE.Group;
  radius: number;
  bounce: number;
  rest: number;
  grip: THREE.Vector3;
  update?: (dt: number, motion?: number) => void;
  dispose: () => void;
}

export interface WorldToy {
  id: number;
  kind: ToyKind;
  toy: ToyProp;
  object: THREE.Group;
  grip: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  inHand: boolean;
  resting: boolean;
  radius: number;
  bounce: number;
  rest: number;
  airTime: number;
}

let nextToyId = 1;

export class ToyWorld {
  readonly list: WorldToy[] = [];
  bounds: Bounds;
  obstacles: Circle[];
  floorY = 0;
  onBounce: ((t: WorldToy, impact: number) => void) | null = null;
  onLand: ((t: WorldToy) => void) | null = null;

  constructor(
    readonly parent: THREE.Object3D,
    bounds: Bounds,
    obstacles: Circle[] = [],
  ) {
    this.bounds = bounds;
    this.obstacles = obstacles;
  }

  add(toy: ToyProp, at: THREE.Vector3): WorldToy {
    const entry: WorldToy = {
      id: nextToyId++,
      kind: toy.kind,
      toy,
      object: toy.object,
      grip: toy.grip.clone(),
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      inHand: false,
      resting: true,
      radius: toy.radius,
      bounce: toy.bounce,
      rest: toy.rest,
      airTime: 0,
    };
    toy.object.position.copy(at);
    toy.object.position.y = Math.max(at.y, this.floorY + entry.rest);
    this.parent.add(toy.object);
    this.list.push(entry);
    return entry;
  }

  findByKind(kind: ToyKind): WorldToy | undefined {
    return this.list.find((t) => t.kind === kind);
  }

  remove(e: WorldToy) {
    const idx = this.list.indexOf(e);
    if (idx >= 0) this.list.splice(idx, 1);
    e.object.removeFromParent();
    e.toy.dispose();
  }

  throw(e: WorldToy, from: THREE.Vector3, vel: THREE.Vector3) {
    this.parent.attach(e.object);
    e.object.position.copy(from);
    e.object.position.y = Math.max(from.y, this.floorY + e.rest + 0.02);
    e.velocity.copy(vel);
    e.inHand = false;
    e.resting = false;
    e.airTime = 0;
    e.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14);
  }

  /** Kitty front-paw bat impulse across the room floor. */
  batImpulse(e: WorldToy, fromPos: THREE.Vector3, power = 1.65) {
    this.parent.attach(e.object);
    e.inHand = false;
    e.resting = false;
    e.airTime = 0;
    const dx = e.object.position.x - fromPos.x;
    const dz = e.object.position.z - fromPos.z;
    const len = Math.hypot(dx, dz);
    const dirX = len > 0.02 ? dx / len : (Math.random() - 0.5);
    const dirZ = len > 0.02 ? dz / len : 0.7;
    const jitter = (Math.random() - 0.5) * 0.55;
    const cosJ = Math.cos(jitter);
    const sinJ = Math.sin(jitter);
    const vx = (dirX * cosJ - dirZ * sinJ) * power;
    const vz = (dirX * sinJ + dirZ * cosJ) * power;
    e.velocity.set(vx, 0.55 + Math.random() * 0.45, vz);
    e.spin.set(vz * 8, (Math.random() - 0.5) * 6, -vx * 8);
  }

  dropAt(e: WorldToy, pos: THREE.Vector3) {
    this.parent.attach(e.object);
    e.object.position.copy(pos);
    e.velocity.set(0, 0, 0);
    e.resting = false;
  }

  update(dt: number) {
    const stepDt = Math.min(dt, 0.05);
    for (const e of this.list) {
      const motion = Math.hypot(e.velocity.x, e.velocity.z);
      e.toy.update?.(stepDt, motion);
      if (e.inHand || e.resting) continue;

      const o = e.object;
      const v = e.velocity;
      const r = e.radius;
      e.airTime += stepDt;

      v.y -= 9.8 * stepDt;
      v.multiplyScalar(1 - 0.06 * stepDt);
      o.position.addScaledVector(v, stepDt);

      o.rotation.x += e.spin.x * stepDt;
      o.rotation.y += e.spin.y * stepDt;
      o.rotation.z += e.spin.z * stepDt;

      const minY = this.floorY + e.rest;
      if (o.position.y < minY) {
        o.position.y = minY;
        const impact = -v.y;
        if (impact > 0.35) {
          v.y = impact * e.bounce;
          this.onBounce?.(e, impact);
        } else {
          v.y = 0;
        }
        const friction = e.kind === 'yarn' ? 0.55 : 0.32;
        v.x *= Math.max(0, 1 - friction * stepDt * 6);
        v.z *= Math.max(0, 1 - friction * stepDt * 6);
        e.spin.multiplyScalar(0.84);
        if (Math.hypot(v.x, v.z) > 0.02) {
          o.rotation.x += (v.z / Math.max(r, 0.02)) * stepDt;
          o.rotation.z -= (v.x / Math.max(r, 0.02)) * stepDt;
        }
        if (Math.abs(v.y) < 0.05 && Math.hypot(v.x, v.z) < 0.05) {
          v.set(0, 0, 0);
          e.resting = true;
          this.onLand?.(e);
        }
      }

      const b = this.bounds;
      if (o.position.x < b.minX + r) {
        o.position.x = b.minX + r;
        v.x = Math.abs(v.x) * 0.55;
        this.onBounce?.(e, Math.abs(v.x));
      }
      if (o.position.x > b.maxX - r) {
        o.position.x = b.maxX - r;
        v.x = -Math.abs(v.x) * 0.55;
        this.onBounce?.(e, Math.abs(v.x));
      }
      if (o.position.z < b.minZ + r) {
        o.position.z = b.minZ + r;
        v.z = Math.abs(v.z) * 0.55;
        this.onBounce?.(e, Math.abs(v.z));
      }
      if (o.position.z > b.maxZ - r) {
        o.position.z = b.maxZ - r;
        v.z = -Math.abs(v.z) * 0.55;
        this.onBounce?.(e, Math.abs(v.z));
      }

      for (const c of this.obstacles) {
        const dx = o.position.x - c.x;
        const dz = o.position.z - c.z;
        const d = Math.hypot(dx, dz);
        if (d < c.r + r && o.position.y < 0.55) {
          const nx = dx / (d || 1);
          const nz = dz / (d || 1);
          o.position.x = c.x + nx * (c.r + r);
          o.position.z = c.z + nz * (c.r + r);
          const vn = v.x * nx + v.z * nz;
          if (vn < 0) {
            v.x -= 1.45 * vn * nx;
            v.z -= 1.45 * vn * nz;
          }
        }
      }
    }
  }

  dispose() {
    while (this.list.length > 0) {
      this.remove(this.list[0]!);
    }
  }
}

/**
 * 6-node Verlet string simulation for the feather cat wand (cần câu mèo).
 */
export class CatWandSim {
  readonly nodes: THREE.Vector3[] = [];
  readonly prevNodes: THREE.Vector3[] = [];
  readonly segmentLen = 0.056;
  readonly floorY = 0;

  constructor(startTip = new THREE.Vector3(0, 0.52, 0.45)) {
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Vector3(startTip.x, Math.max(0.03, startTip.y - i * this.segmentLen), startTip.z);
      this.nodes.push(p);
      this.prevNodes.push(p.clone());
    }
  }

  get lurePos(): THREE.Vector3 {
    return this.nodes[this.nodes.length - 1]!;
  }

  impulseLure(vec: THREE.Vector3) {
    const last = this.nodes[this.nodes.length - 1]!;
    last.add(vec);
  }

  step(dt: number, anchorTip: THREE.Vector3) {
    const h = Math.min(dt, 0.033);
    const damping = 0.94;
    const gravityY = -9.2 * h * h;

    this.nodes[0]!.copy(anchorTip);
    this.prevNodes[0]!.copy(anchorTip);

    for (let i = 1; i < this.nodes.length; i++) {
      const cur = this.nodes[i]!;
      const prev = this.prevNodes[i]!;
      const vx = (cur.x - prev.x) * damping;
      const vy = (cur.y - prev.y) * damping;
      const vz = (cur.z - prev.z) * damping;
      prev.copy(cur);
      cur.x += vx;
      cur.y += vy + gravityY;
      cur.z += vz;
    }

    // Distance constraints
    for (let iter = 0; iter < 4; iter++) {
      this.nodes[0]!.copy(anchorTip);
      for (let i = 0; i < this.nodes.length - 1; i++) {
        const a = this.nodes[i]!;
        const b = this.nodes[i + 1]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dy, dz) || 1e-5;
        const diff = (dist - this.segmentLen) / dist;
        if (i === 0) {
          b.x -= dx * diff;
          b.y -= dy * diff;
          b.z -= dz * diff;
        } else {
          a.x += dx * diff * 0.5;
          a.y += dy * diff * 0.5;
          a.z += dz * diff * 0.5;
          b.x -= dx * diff * 0.5;
          b.y -= dy * diff * 0.5;
          b.z -= dz * diff * 0.5;
        }
        if (b.y < this.floorY + 0.025) b.y = this.floorY + 0.025;
      }
    }
  }
}
