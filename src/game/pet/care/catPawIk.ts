import * as THREE from 'three';

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
  if (!bone || !bone.parent || Math.abs(angleRad) < 1e-4) return;
  bone.parent.getWorldQuaternion(_parentQ);
  actorGroup.getWorldQuaternion(_actorQ);
  _localAxis.copy(actorAxis).applyQuaternion(_actorQ);
  _invQ.copy(_parentQ).invert();
  _localAxis.applyQuaternion(_invQ);
  _invQ.copy(bone.quaternion).invert();
  _localAxis.applyQuaternion(_invQ).normalize();
  _deltaQ.setFromAxisAngle(_localAxis, angleRad);
  bone.quaternion.multiply(_deltaQ);
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
 * Aims the active front paw directly toward live 3D toy/wand coordinates while grounding the support paw.
 */
export function solveVuenaFrontPawIk(params: VuenaPawIkParams): void {
  const { actorGroup, spine, upperActive, lowerActive, upperSupport, targetWorld, side, weight, anticipation = 0 } = params;
  if (!upperActive || !lowerActive) return;

  const sideSign = side === 'L' ? 1 : -1;

  // Anticipation wind-up tuck back before strike
  if (anticipation > 0.01) {
    rotateBoneAxis(upperActive, actorGroup, _axisX, -0.82 * anticipation);
    rotateBoneAxis(lowerActive, actorGroup, _axisX, -0.45 * anticipation);
    rotateBoneAxis(spine, actorGroup, _axisY, sideSign * 0.08 * anticipation);
  }

  if (weight <= 0.01) return;

  let aimPitch = -0.92;
  let aimYaw = sideSign * 0.14;
  let elbowExtend = 0.25;

  if (targetWorld) {
    upperActive.getWorldPosition(_shoulderWorld);
    actorGroup.getWorldQuaternion(_actorQ);
    _actorInvQ.copy(_actorQ).invert();
    _relActor.copy(targetWorld).sub(_shoulderWorld).applyQuaternion(_actorInvQ);

    // Account for world scale on root (or fallback to unit 1)
    const scale = Math.max(0.2, actorGroup.scale.y || 1);
    const dx = _relActor.x / scale;
    const dy = _relActor.y / scale;
    const dz = Math.max(0.02, _relActor.z / scale);

    const flatDist = Math.max(0.025, Math.hypot(dx, dz));
    const totalDist = THREE.MathUtils.clamp(Math.hypot(flatDist, dy), 0.04, VUENA_UPPER_LEN + VUENA_LOWER_LEN + 0.04);

    // Elevation angle relative to rest vertical down (-Y axis -> forward +Z is negative X rotation in actor frame)
    const elevAngle = Math.atan2(dy, flatDist); // >0 above shoulder, <0 floor level
    aimPitch = THREE.MathUtils.clamp(-0.78 - elevAngle * 0.92, -1.55, -0.35);
    aimYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz) * 0.72, -0.58, 0.58);

    // 2-bone reach extension vs bend (law of cosines proxy clamped for cozy proportions)
    const reachRatio = THREE.MathUtils.clamp(totalDist / (VUENA_UPPER_LEN + VUENA_LOWER_LEN), 0.35, 1.0);
    elbowExtend = THREE.MathUtils.lerp(-0.42, 0.38, reachRatio);
  }

  // Subtle torso lean & counter-stabilized support paw
  rotateBoneAxis(spine, actorGroup, _axisX, 0.12 * weight);
  rotateBoneAxis(spine, actorGroup, _axisY, aimYaw * 0.28 * weight);
  rotateBoneAxis(upperSupport, actorGroup, _axisX, 0.08 * weight);
  rotateBoneAxis(upperSupport, actorGroup, _axisZ, -sideSign * 0.12 * weight);

  // Drive active shoulder + elbow toward target world position
  rotateBoneAxis(upperActive, actorGroup, _axisX, aimPitch * weight);
  rotateBoneAxis(upperActive, actorGroup, _axisY, aimYaw * weight);
  rotateBoneAxis(lowerActive, actorGroup, _axisX, elbowExtend * weight);
}
