import * as THREE from 'three';
import {
  constrainPawReachTarget,
  safeFinite,
  safeNormalizeVec3,
  sanitizeQuaternion,
} from './catAnatomyConstraints';

const _shoulderWorld = new THREE.Vector3();
const _actorQ = new THREE.Quaternion();
const _actorInvQ = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();
const _invQ = new THREE.Quaternion();
const _localAxis = new THREE.Vector3();
const _deltaQ = new THREE.Quaternion();
const _relActor = new THREE.Vector3();

const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);

/**
 * Total Vuena front limb length in world units (`FrontUpperLeg` 0.071 + `FrontLowerLeg` ~0.071 at actor scale).
 */
const VUENA_UPPER_LEN = 0.071;
const VUENA_LOWER_LEN = 0.071;

function rotateBoneAxis(
  bone: THREE.Object3D | undefined,
  actorGroup: THREE.Object3D,
  actorAxis: THREE.Vector3,
  angleRad: number,
): void {
  if (!bone || !bone.parent || !Number.isFinite(angleRad) || Math.abs(angleRad) < 1e-4) return;
  bone.parent.getWorldQuaternion(_parentQ);
  actorGroup.getWorldQuaternion(_actorQ);
  sanitizeQuaternion(_parentQ);
  sanitizeQuaternion(_actorQ);
  _localAxis.copy(actorAxis).applyQuaternion(_actorQ);
  _invQ.copy(_parentQ).invert();
  _localAxis.applyQuaternion(_invQ);
  sanitizeQuaternion(bone.quaternion);
  _invQ.copy(bone.quaternion).invert();
  _localAxis.applyQuaternion(_invQ);
  safeNormalizeVec3(_localAxis, actorAxis);
  _deltaQ.setFromAxisAngle(_localAxis, safeFinite(angleRad, 0));
  bone.quaternion.multiply(_deltaQ);
  sanitizeQuaternion(bone.quaternion);
}

export interface VuenaPawIkParams {
  actorGroup: THREE.Object3D;
  spine?: THREE.Object3D;
  upperActive?: THREE.Object3D;
  lowerActive?: THREE.Object3D;
  upperSupport?: THREE.Object3D;
  targetWorld: THREE.Vector3 | null | undefined;
  side: 'L' | 'R';
  /** IK blend weight 0..1 (1 = peak paw contact on toy). */
  weight: number;
  /** Optional anticipation tuck (-1..0) before extending toward target. */
  anticipation?: number;
}

/**
 * Constrained analytical 2-bone front-paw IK solver for Vuena's 19-bone GLB rig.
 * Aims the active front paw directly toward live 3D toy/wand coordinates while grounding the support paw,
 * enforcing anatomical reach shells, floor clearance, and NaN/zero-vector safety.
 */
export function solveVuenaFrontPawIk(params: VuenaPawIkParams): void {
  const { actorGroup, spine, upperActive, lowerActive, upperSupport, targetWorld, side } = params;
  if (!upperActive || !lowerActive) return;

  const weight = THREE.MathUtils.clamp(safeFinite(params.weight, 0), 0, 1);
  const anticipation = THREE.MathUtils.clamp(safeFinite(params.anticipation ?? 0, 0), 0, 1);
  const sideSign = side === 'L' ? 1 : -1;

  // Anticipation wind-up tuck back before strike
  if (anticipation > 0.01) {
    rotateBoneAxis(upperActive, actorGroup, _axisX, -0.82 * anticipation);
    rotateBoneAxis(lowerActive, actorGroup, _axisX, -0.45 * anticipation);
    rotateBoneAxis(spine, actorGroup, _axisY, sideSign * 0.08 * anticipation);
  }

  if (weight <= 0.01) return;

  let effectiveWeight = weight;
  let aimPitch = -0.92;
  let aimYaw = sideSign * 0.14;
  let elbowExtend = 0.25;

  if (
    targetWorld &&
    Number.isFinite(targetWorld.x) &&
    Number.isFinite(targetWorld.y) &&
    Number.isFinite(targetWorld.z)
  ) {
    const measuredLower = lowerActive.position.length();
    const upperLen = VUENA_UPPER_LEN;
    const lowerLen = measuredLower > 0.01 ? measuredLower : VUENA_LOWER_LEN;

    upperActive.getWorldPosition(_shoulderWorld);
    actorGroup.getWorldQuaternion(_actorQ);
    sanitizeQuaternion(_actorQ);
    _actorInvQ.copy(_actorQ).invert();
    _relActor.copy(targetWorld).sub(_shoulderWorld).applyQuaternion(_actorInvQ);

    const reach = constrainPawReachTarget({
      relActor: _relActor,
      upperLen,
      lowerLen,
      shoulderWorldY: _shoulderWorld.y,
      actorScale: actorGroup.scale.y || 1,
      floorY: 0.014,
    });
    effectiveWeight *= reach.reachWeight;
    if (effectiveWeight <= 0.01) return;

    const { x: dx, y: dy, z: dz } = reach.localTarget;
    const flatDist = Math.max(0.025, Math.hypot(dx, dz));
    const totalDist = reach.localTarget.length();

    // Elevation angle relative to rest vertical down (-Y axis -> forward +Z is negative X rotation in actor frame)
    const elevAngle = Math.atan2(dy, flatDist); // >0 above shoulder, <0 floor level
    aimPitch = THREE.MathUtils.clamp(-0.78 - elevAngle * 0.85, -1.32, -0.3);
    aimYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz) * 0.65, -0.45, 0.45);

    // 2-bone reach extension vs bend (law of cosines proxy clamped for anatomical limits)
    const reachRatio = THREE.MathUtils.clamp(totalDist / (upperLen + lowerLen), 0.32, 0.98);
    elbowExtend = THREE.MathUtils.clamp(THREE.MathUtils.lerp(-0.4, 0.34, reachRatio), -0.42, 0.34);
  }

  // Subtle torso lean & counter-stabilized support paw
  rotateBoneAxis(spine, actorGroup, _axisX, THREE.MathUtils.clamp(0.11 * effectiveWeight, -0.14, 0.14));
  rotateBoneAxis(spine, actorGroup, _axisY, THREE.MathUtils.clamp(aimYaw * 0.25 * effectiveWeight, -0.18, 0.18));
  rotateBoneAxis(upperSupport, actorGroup, _axisX, 0.08 * effectiveWeight);
  rotateBoneAxis(upperSupport, actorGroup, _axisZ, -sideSign * 0.12 * effectiveWeight);

  // Drive active shoulder + elbow toward target world position
  rotateBoneAxis(upperActive, actorGroup, _axisX, aimPitch * effectiveWeight);
  rotateBoneAxis(upperActive, actorGroup, _axisY, aimYaw * effectiveWeight);
  rotateBoneAxis(lowerActive, actorGroup, _axisX, elbowExtend * effectiveWeight);
}
