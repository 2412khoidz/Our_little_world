import * as THREE from 'three';

export interface JointAngleLimits {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface RestBoneEntry {
  readonly name: string;
  readonly bone: THREE.Bone;
  readonly pos: THREE.Vector3;
  readonly quat: THREE.Quaternion;
  readonly length: number;
}

export function safeFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function safeNormalizeVec3(v: THREE.Vector3, fallback: THREE.Vector3): THREE.Vector3 {
  const lenSq = v.lengthSq();
  if (!Number.isFinite(lenSq) || lenSq < 1e-10) {
    return v.copy(fallback).normalize();
  }
  return v.multiplyScalar(1 / Math.sqrt(lenSq));
}

export function sanitizeQuaternion(q: THREE.Quaternion, fallback?: THREE.Quaternion): THREE.Quaternion {
  if (
    !Number.isFinite(q.x) ||
    !Number.isFinite(q.y) ||
    !Number.isFinite(q.z) ||
    !Number.isFinite(q.w) ||
    q.lengthSq() < 1e-10
  ) {
    return fallback ? q.copy(fallback) : q.identity();
  }
  return q.normalize();
}

/** Anatomical rotation bounds (radians relative to rest pose) preserving authored Vuena sleep/sit/jump poses while blocking 360° spins & inversions. */
export const VUENA_JOINT_LIMITS: Readonly<Record<string, JointAngleLimits>> = {
  Hips: { minX: -1.15, maxX: 1.15, minY: -1.0, maxY: 1.0, minZ: -1.2, maxZ: 1.2 },
  Spine: { minX: -0.95, maxX: 0.95, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  Neck: { minX: -0.65, maxX: 0.65, minY: -0.78, maxY: 0.78, minZ: -0.5, maxZ: 0.5 },
  Head: { minX: -0.78, maxX: 0.78, minY: -0.9, maxY: 0.9, minZ: -0.6, maxZ: 0.6 },
  Ear_L: { minX: -0.5, maxX: 0.5, minY: -0.35, maxY: 0.35, minZ: -0.8, maxZ: 0.8 },
  Ear_R: { minX: -0.5, maxX: 0.5, minY: -0.35, maxY: 0.35, minZ: -0.8, maxZ: 0.8 },
  Tail_1: { minX: -1.55, maxX: 1.55, minY: -1.45, maxY: 1.45, minZ: -1.0, maxZ: 1.0 },
  Tail_2: { minX: -1.55, maxX: 1.55, minY: -1.45, maxY: 1.45, minZ: -1.0, maxZ: 1.0 },
  FrontUpperLeg_L: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  FrontUpperLeg_R: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  FrontLowerLeg_L: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  FrontLowerLeg_R: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  BackUpperLeg_L: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  BackUpperLeg_R: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  BackLowerLeg_L: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
  BackLowerLeg_R: { minX: -2.1, maxX: 1.8, minY: -0.85, maxY: 0.85, minZ: -0.85, maxZ: 0.85 },
};

const _restInv = new THREE.Quaternion();
const _relQuat = new THREE.Quaternion();
const _relEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _probeWorld = new THREE.Vector3();

/**
 * Clamps a bone's current local orientation against anatomical XYZ Euler bounds relative to `restQuat`.
 */
export function clampBoneRelativeToRest(
  bone: THREE.Object3D,
  restQuat: THREE.Quaternion,
  limits: JointAngleLimits,
): void {
  sanitizeQuaternion(bone.quaternion, restQuat);
  _restInv.copy(restQuat).invert();
  _relQuat.copy(_restInv).multiply(bone.quaternion);
  sanitizeQuaternion(_relQuat);

  _relEuler.setFromQuaternion(_relQuat, 'YXZ');
  const cx = THREE.MathUtils.clamp(safeFinite(_relEuler.x, 0), limits.minX, limits.maxX);
  const cy = THREE.MathUtils.clamp(safeFinite(_relEuler.y, 0), limits.minY, limits.maxY);
  const cz = THREE.MathUtils.clamp(safeFinite(_relEuler.z, 0), limits.minZ, limits.maxZ);

  _relEuler.set(cx, cy, cz, 'YXZ');
  _relQuat.setFromEuler(_relEuler);
  bone.quaternion.copy(restQuat).multiply(_relQuat);
  sanitizeQuaternion(bone.quaternion, restQuat);
}

/**
 * Distance-constraint pass (PBD-inspired): preserves exact rest segment length for skeleton bones
 * so procedural overlays or numerical drift never stretch or detach limbs.
 * Leaves `Hips` (root bounce) and `Lids` (eyelid closure translation) untouched.
 */
export function preserveBoneLengths(restEntries: readonly RestBoneEntry[]): void {
  for (let i = 0; i < restEntries.length; i += 1) {
    const entry = restEntries[i]!;
    if (entry.name === 'Hips' || entry.name === 'Lids') continue;
    const p = entry.bone.position;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
      p.copy(entry.pos);
      continue;
    }
    if (entry.length > 1e-4) {
      const curLenSq = p.lengthSq();
      if (curLenSq < 1e-10) {
        p.copy(entry.pos);
      } else if (Math.abs(Math.sqrt(curLenSq) - entry.length) > 1e-5) {
        p.multiplyScalar(entry.length / Math.sqrt(curLenSq));
      }
    }
  }
}

/**
 * Reachability shell constraint for 2-bone front paw IK:
 * keeps targets inside `[0.32 * totalLen, 0.98 * totalLen]`, above floorY,
 * and smoothly attenuates weight when target lies behind the chest (`dz < 0.015`).
 */
export function constrainPawReachTarget(params: {
  relActor: THREE.Vector3;
  upperLen: number;
  lowerLen: number;
  shoulderWorldY: number;
  actorScale: number;
  floorY?: number;
}): { localTarget: THREE.Vector3; reachWeight: number } {
  const scale = Math.max(0.2, safeFinite(params.actorScale, 1));
  const totalLen = Math.max(0.05, params.upperLen + params.lowerLen);
  const floorY = params.floorY ?? 0.014;
  const rx = safeFinite(params.relActor.x, 0) / scale;
  let ry = safeFinite(params.relActor.y, 0) / scale;
  const rz = safeFinite(params.relActor.z, totalLen * 0.6) / scale;

  // Prevent reaching below the floor plane in actor frame
  const minLocalY = (floorY - safeFinite(params.shoulderWorldY, 0.14)) / scale;
  if (ry < minLocalY) ry = minLocalY;

  // Fade reach weight smoothly if target moves behind shoulder
  const forwardFactor = THREE.MathUtils.smoothstep(rz, -0.02, 0.04);
  const clampedZ = Math.max(0.018, rz);

  const clamped = new THREE.Vector3(rx, ry, clampedZ);
  const rawDist = clamped.length();
  const minReach = totalLen * 0.32;
  const maxReach = totalLen * 0.98;
  if (rawDist < 1e-6) {
    clamped.set(0, -minReach * 0.6, minReach * 0.8);
  } else if (rawDist < minReach) {
    clamped.multiplyScalar(minReach / rawDist);
  } else if (rawDist > maxReach) {
    clamped.multiplyScalar(maxReach / rawDist);
  }

  // Soft rolloff when far beyond arm's comfortable envelope (> 2.4x arm length)
  const rawMag = Math.hypot(rx, ry, Math.max(0, rz));
  const distanceFactor = rawMag > totalLen * 2.5 ? THREE.MathUtils.clamp(1 - (rawMag - totalLen * 2.5) / (totalLen * 2.2), 0.25, 1) : 1;

  return {
    localTarget: clamped,
    reachWeight: THREE.MathUtils.clamp(forwardFactor * distanceFactor, 0, 1),
  };
}

const CONTACT_BONE_KEYS = [
  'FrontLowerLeg_L',
  'FrontLowerLeg_R',
  'BackLowerLeg_L',
  'BackLowerLeg_R',
  'Head',
  'Hips',
] as const;

/**
 * Light unilateral floor contact constraint: prevents limbs/head from penetrating below `floorY`
 * when procedural tilts or idle dips occur.
 */
export function enforceCatGroundContact(
  animRoot: THREE.Object3D,
  actorGroup: THREE.Object3D,
  bones: Record<string, THREE.Bone | undefined>,
  floorY = 0,
): void {
  animRoot.position.y = THREE.MathUtils.clamp(safeFinite(animRoot.position.y, 0), floorY, 0.35);
  actorGroup.updateMatrixWorld(true);

  let minWorldY = Infinity;
  for (const key of CONTACT_BONE_KEYS) {
    const bone = bones[key];
    if (!bone) continue;
    bone.getWorldPosition(_probeWorld);
    if (Number.isFinite(_probeWorld.y) && _probeWorld.y < minWorldY) {
      minWorldY = _probeWorld.y;
    }
  }

  if (Number.isFinite(minWorldY) && minWorldY < floorY - 0.012) {
    const lift = Math.min(0.24, floorY - minWorldY);
    animRoot.position.y = Math.min(0.35, animRoot.position.y + lift);
  }
}
