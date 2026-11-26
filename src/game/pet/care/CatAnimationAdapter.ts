import * as THREE from 'three';
import type { PetCareTailMode } from '../../../shared/petLiving/petCare/petCareTypes';
import { solveVuenaFrontPawIk } from './catPawIk';
import type { HugKickOverlayState, IPetCareRig, LookTarget, PawSwipeOverlayState } from './petCareActorTypes';

export const VUENA_CLIP_NAMES = [
  'idle',
  'idle_alt',
  'walk',
  'run',
  'jump',
  'eat',
  'sit',
  'sleep',
  'attack',
  'call',
  'hit',
  'death',
  'assist',
] as const;

export type VuenaClipName = (typeof VUENA_CLIP_NAMES)[number];

export interface ClipSelectionResult {
  clip: VuenaClipName;
  timeScale: number;
  loopOnce: boolean;
  fadeSec: number;
  /** Optional normalized pause timestamp (used for playful belly-roll from `death`). */
  clampTimeSec?: number;
}

/**
 * Pure state-to-clip selector mapping every CatBrain pose & speed into the 13 Vuena GLB animations.
 */
export function selectVuenaClipForState(params: {
  pose: string;
  speed: number;
  idleAltFlag?: boolean;
  poseElapsedSec?: number;
}): ClipSelectionResult {
  const { pose, speed, idleAltFlag = false, poseElapsedSec = 0 } = params;

  if (pose === 'jump') {
    return { clip: 'jump', timeScale: 1.45, loopOnce: true, fadeSec: 0.09 };
  }
  if (pose === 'attack') {
    return { clip: 'attack', timeScale: 1.4, loopOnce: true, fadeSec: 0.1 };
  }
  if (pose === 'paw_bat' || pose === 'knead') {
    return { clip: 'idle', timeScale: 0.95, loopOnce: false, fadeSec: 0.12 };
  }
  if (pose === 'hug_kick' || pose === 'belly') {
    return { clip: 'idle', timeScale: 0.85, loopOnce: false, fadeSec: 0.22 };
  }
  if (pose === 'death_dramatic') {
    return { clip: 'death', timeScale: 1.0, loopOnce: true, fadeSec: 0.22 };
  }
  if (pose === 'eat') {
    return { clip: 'eat', timeScale: 1.05, loopOnce: false, fadeSec: 0.18 };
  }
  if (pose === 'sleep') {
    return { clip: 'sleep', timeScale: 0.9, loopOnce: false, fadeSec: 0.32 };
  }
  if (pose === 'stretch') {
    return { clip: 'assist', timeScale: 0.85, loopOnce: true, fadeSec: 0.22 };
  }
  if (pose === 'call') {
    return { clip: 'call', timeScale: 1.0, loopOnce: true, fadeSec: 0.12 };
  }
  if (pose === 'refuse') {
    if (poseElapsedSec < 0.45) {
      return { clip: 'hit', timeScale: 1.0, loopOnce: true, fadeSec: 0.1 };
    }
    return { clip: 'sit', timeScale: 1.0, loopOnce: false, fadeSec: 0.22 };
  }
  if (pose === 'sit' || pose === 'lie' || pose === 'box_peek' || pose === 'groom' || pose === 'arch_purr') {
    return { clip: 'sit', timeScale: 1.0, loopOnce: false, fadeSec: 0.22 };
  }
  if (pose === 'stalk' || pose === 'sniff') {
    return { clip: 'idle_alt', timeScale: 1.1, loopOnce: false, fadeSec: 0.18 };
  }

  // Locomotion blends when standing/moving
  if (speed > 0.35) {
    return {
      clip: 'run',
      timeScale: THREE.MathUtils.clamp(speed / 0.44, 0.85, 1.6),
      loopOnce: false,
      fadeSec: 0.14,
    };
  }
  if (speed > 0.04) {
    return {
      clip: 'walk',
      timeScale: THREE.MathUtils.clamp(speed / 0.24, 0.72, 1.5),
      loopOnce: false,
      fadeSec: 0.16,
    };
  }

  return {
    clip: idleAltFlag ? 'idle_alt' : 'idle',
    timeScale: 1.0,
    loopOnce: false,
    fadeSec: 0.24,
  };
}

const _parentQ = new THREE.Quaternion();
const _actorQ = new THREE.Quaternion();
const _localAxis = new THREE.Vector3();
const _deltaQ = new THREE.Quaternion();
const _targetWorld = new THREE.Vector3();
const _headWorld = new THREE.Vector3();
const _invQ = new THREE.Quaternion();

/** Rotates a rigged bone by `angleRad` around an axis defined in the actor's local frame (+X left, +Y up, +Z forward). */
function rotateBoneAroundActorAxis(
  bone: THREE.Object3D | undefined,
  actorGroup: THREE.Object3D,
  actorAxis: THREE.Vector3,
  angleRad: number,
): void {
  if (!bone || Math.abs(angleRad) < 1e-4) return;
  const parent = bone.parent;
  if (!parent) return;
  parent.getWorldQuaternion(_parentQ);
  actorGroup.getWorldQuaternion(_actorQ);
  // Convert actor-local axis -> world -> parent-local -> bone-local
  _localAxis.copy(actorAxis).applyQuaternion(_actorQ);
  _invQ.copy(_parentQ).invert();
  _localAxis.applyQuaternion(_invQ);
  // Convert from parent-local into bone-local space via inverse of current bone.quaternion
  _invQ.copy(bone.quaternion).invert();
  _localAxis.applyQuaternion(_invQ).normalize();
  _deltaQ.setFromAxisAngle(_localAxis, angleRad);
  bone.quaternion.multiply(_deltaQ);
}

/** Exact closed-eyelid local translation from `vuena-cat.glb` (`sleep` / `hit` midframe). */
const VUENA_LIDS_CLOSED_DELTA = new THREE.Vector3(0, 0.0455, 0.0207);

export class CatAnimationAdapter implements IPetCareRig {
  pose = 'stand';
  poseRate = 7;

  tailMode: PetCareTailMode = 'idle';
  wagAmp = 0.22;
  wagFreq = 1.6;
  tailRaise = 0.15;
  happy = 0;
  mouthOpen = 0;
  jawHold = 0;
  tongueOut = 0;
  eyesClosed = 0;
  earPerk = 0;
  headTilt = 0;
  look: LookTarget = { point: null, weight: 0 };
  overlay: Record<string, [number, number, number]> = {};
  rootLift = 0;
  rootRoll = 0;
  speed = 0;
  turnRate = 0;
  activeClip = 'idle';
  pawSwipe: PawSwipeOverlayState = { side: 'L', progress: 0, active: false };
  hugKick: HugKickOverlayState = { active: false, phase: 0 };

  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<VuenaClipName, THREE.AnimationAction>();
  private currentClip: VuenaClipName | null = null;
  private poseElapsed = 0;
  private elapsed = 0;
  private idleAltTimer = 5.5;
  private idleAltActive = false;
  private lookYaw = 0;
  private lookPitch = 0;
  private headTiltCur = 0;
  private blinkTimer = 2.6;
  private blinkHoldSec = 0;
  private happyBlinkTimer = 2.1;
  private wagPhase = 0;
  private readonly restLidsPos = new THREE.Vector3(0, 0, 0);
  private readonly restHipsPos = new THREE.Vector3(0, 0, 0);
  private readonly restBoneTransforms: Array<{ bone: THREE.Bone; pos: THREE.Vector3; quat: THREE.Quaternion }> = [];
  private hugRollCur = 0;

  constructor(
    private readonly actorGroup: THREE.Group,
    private readonly animRoot: THREE.Object3D,
    clips: THREE.AnimationClip[],
    private readonly bones: Record<string, THREE.Bone>,
  ) {
    this.mixer = new THREE.AnimationMixer(animRoot);
    for (const bone of Object.values(bones)) {
      if (!bone) continue;
      this.restBoneTransforms.push({
        bone,
        pos: bone.position.clone(),
        quat: bone.quaternion.clone(),
      });
    }
    for (const clip of clips) {
      const key = clip.name as VuenaClipName;
      if (VUENA_CLIP_NAMES.includes(key)) {
        const action = this.mixer.clipAction(clip);
        this.actions.set(key, action);
      }
    }
    if (bones.Lids) this.restLidsPos.copy(bones.Lids.position);
    if (bones.Hips) this.restHipsPos.copy(bones.Hips.position);

    const idleAction = this.actions.get('idle');
    if (idleAction) {
      idleAction.reset().play();
      this.currentClip = 'idle';
      this.activeClip = 'idle';
    }
  }

  get availableClips(): string[] {
    return Array.from(this.actions.keys());
  }

  setPose(name: string, rate = 7): void {
    if (this.pose !== name) {
      this.poseElapsed = 0;
    }
    this.pose = name;
    this.poseRate = rate;
  }

  private switchClip(sel: ClipSelectionResult): void {
    const next = this.actions.get(sel.clip);
    if (!next) return;

    if (this.currentClip !== sel.clip) {
      const prev = this.currentClip ? this.actions.get(this.currentClip) : undefined;
      next.reset();
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.setEffectiveTimeScale(sel.timeScale);
      if (sel.loopOnce) {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      } else {
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = false;
      }
      if (typeof sel.clampTimeSec === 'number') {
        next.play();
        next.time = sel.clampTimeSec;
        next.paused = true;
      } else {
        next.paused = false;
        next.play();
      }
      if (prev && prev !== next) {
        prev.crossFadeTo(next, sel.fadeSec, false);
      }
      this.currentClip = sel.clip;
      this.activeClip = sel.clip;
    } else {
      next.setEffectiveTimeScale(sel.timeScale);
      if (typeof sel.clampTimeSec === 'number') {
        next.time = sel.clampTimeSec;
        next.paused = true;
      } else {
        next.paused = false;
      }
    }
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.poseElapsed += dt;

    // Reset all bones to clean rest poses before sampling mixer + additive overlays (prevents quaternion accumulation / 360-deg neck spins)
    for (let i = 0; i < this.restBoneTransforms.length; i += 1) {
      const entry = this.restBoneTransforms[i]!;
      entry.bone.position.copy(entry.pos);
      entry.bone.quaternion.copy(entry.quat);
    }

    // Subtle idle variation between `idle` and `idle_alt`
    if (this.pose === 'stand' && this.speed <= 0.04) {
      this.idleAltTimer -= dt;
      if (this.idleAltTimer <= 0) {
        this.idleAltActive = !this.idleAltActive;
        this.idleAltTimer = this.idleAltActive ? 2.4 : 5.5 + Math.random() * 3.5;
      }
    } else {
      this.idleAltActive = false;
    }

    const selection = selectVuenaClipForState({
      pose: this.pose,
      speed: this.speed,
      idleAltFlag: this.idleAltActive,
      poseElapsedSec: this.poseElapsed,
    });
    this.switchClip(selection);
    this.mixer.update(dt);

    // Apply vertical jump lift / playful crouch tilt without ever penetrating the floor (y >= 0) or flipping upside down
    const wantHugRoll = this.hugKick.active
      ? Math.min(1, this.hugKick.phase / 0.28) *
        (this.hugKick.phase > 1.25 ? Math.max(0, 1 - (this.hugKick.phase - 1.25) / 0.3) : 1)
      : 0;
    this.hugRollCur += (wantHugRoll - this.hugRollCur) * (1 - Math.exp(-14 * dt));
    this.animRoot.position.y = Math.max(0, this.rootLift);
    this.animRoot.rotation.z = THREE.MathUtils.clamp(this.rootRoll + 0.28 * this.hugRollCur, -0.35, 0.35);

    this.applyAdditiveOverlays(dt);
  }

  private applyAdditiveOverlays(dt: number): void {
    this.actorGroup.updateMatrixWorld(true);

    // 1. Crisp binary Eyelid overlay (exact GLB rest or exact closed offset — never half-open rim clipping)
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkHoldSec = 0.16;
      this.blinkTimer = 2.5 + Math.random() * 3.0;
    }
    let happyBlink = false;
    if (this.happy > 0.65) {
      this.happyBlinkTimer -= dt;
      if (this.happyBlinkTimer <= 0) {
        this.blinkHoldSec = Math.max(this.blinkHoldSec, 0.34);
        this.happyBlinkTimer = 2.2 + Math.random() * 1.4;
      }
      happyBlink = this.blinkHoldSec > 0;
    }
    this.blinkHoldSec = Math.max(0, this.blinkHoldSec - dt);
    const closedBinary = this.eyesClosed > 0.5 || this.blinkHoldSec > 0 || happyBlink ? 1 : 0;
    if (this.bones.Lids && this.pose !== 'sleep') {
      this.bones.Lids.position.copy(this.restLidsPos).addScaledVector(VUENA_LIDS_CLOSED_DELTA, closedBinary);
    }

    // 2. Smooth head LookAt + Tilt + Sniff/Groom nod
    let targetYaw = 0;
    let targetPitch = 0;
    if (this.look.point && this.look.weight > 0.01 && this.bones.Head) {
      this.bones.Head.getWorldPosition(_headWorld);
      this.actorGroup.getWorldQuaternion(_actorQ);
      _invQ.copy(_actorQ).invert();
      _targetWorld.copy(this.look.point).sub(_headWorld).applyQuaternion(_invQ);
      const flatDist = Math.max(0.05, Math.hypot(_targetWorld.x, _targetWorld.z));
      targetYaw = THREE.MathUtils.clamp(Math.atan2(_targetWorld.x, _targetWorld.z), -0.52, 0.52) * this.look.weight;
      targetPitch = THREE.MathUtils.clamp(-Math.atan2(_targetWorld.y, flatDist), -0.28, 0.28) * this.look.weight;
    }
    this.lookYaw += (targetYaw - this.lookYaw) * (1 - Math.exp(-8 * dt));
    this.lookPitch += (targetPitch - this.lookPitch) * (1 - Math.exp(-8 * dt));
    this.headTiltCur += (this.headTilt - this.headTiltCur) * (1 - Math.exp(-8 * dt));

    const headOv = this.overlay.head;
    const ovPitch = headOv ? headOv[0] : 0;
    const ovYaw = headOv ? headOv[1] : 0;
    const ovRoll = headOv ? headOv[2] : 0;

    const neckYaw = THREE.MathUtils.clamp((this.lookYaw + ovYaw) * 0.42, -0.35, 0.35);
    const neckPitch = THREE.MathUtils.clamp((this.lookPitch + ovPitch) * 0.35, -0.22, 0.22);
    const headYaw = THREE.MathUtils.clamp((this.lookYaw + ovYaw) * 0.58, -0.48, 0.48);
    const headPitch = THREE.MathUtils.clamp((this.lookPitch + ovPitch) * 0.55, -0.28, 0.28);
    const headRoll = THREE.MathUtils.clamp(this.headTiltCur + ovRoll, -0.26, 0.26);

    if (this.bones.Neck) {
      rotateBoneAroundActorAxis(this.bones.Neck, this.actorGroup, new THREE.Vector3(0, 1, 0), neckYaw);
      rotateBoneAroundActorAxis(this.bones.Neck, this.actorGroup, new THREE.Vector3(1, 0, 0), neckPitch);
    }
    if (this.bones.Head) {
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(0, 1, 0), headYaw);
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(1, 0, 0), headPitch);
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(0, 0, 1), headRoll);
    }

    // 3. Stalk crouch & butt-wiggle overlay
    if (this.pose === 'stalk' && this.bones.Hips) {
      const pelvisOv = this.overlay.pelvis;
      const wiggle = pelvisOv ? pelvisOv[1] : Math.sin(this.elapsed * 20) * 0.08;
      rotateBoneAroundActorAxis(this.bones.Hips, this.actorGroup, new THREE.Vector3(0, 1, 0), wiggle);
      rotateBoneAroundActorAxis(this.bones.Hips, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.14);
      if (this.bones.FrontUpperLeg_L) {
        rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.22);
      }
      if (this.bones.FrontUpperLeg_R) {
        rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.22);
      }
    }

    // 4. Airplane / Perked Ears
    if (Math.abs(this.earPerk) > 0.05) {
      const flatten = this.earPerk < 0 ? -this.earPerk * 0.62 : -this.earPerk * 0.12;
      rotateBoneAroundActorAxis(this.bones.Ear_L, this.actorGroup, new THREE.Vector3(0, 0, 1), flatten);
      rotateBoneAroundActorAxis(this.bones.Ear_R, this.actorGroup, new THREE.Vector3(0, 0, 1), -flatten);
      if (this.earPerk > 0) {
        rotateBoneAroundActorAxis(this.bones.Ear_L, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.16 * this.earPerk);
        rotateBoneAroundActorAxis(this.bones.Ear_R, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.16 * this.earPerk);
      }
    }

    // 5. Tail expressiveness (wag_slow / wag_fast / tuck)
    if (this.pose !== 'sleep') {
      this.wagPhase += dt * this.wagFreq * Math.PI * 2;
      const sideSign = this.tailMode === 'tuck' ? 0.04 : Math.sin(this.wagPhase) * this.wagAmp;
      const raisePitch = this.tailMode === 'tuck' ? 0.55 : -this.tailRaise * 0.45;
      rotateBoneAroundActorAxis(this.bones.Tail_1, this.actorGroup, new THREE.Vector3(0, 1, 0), sideSign);
      rotateBoneAroundActorAxis(this.bones.Tail_1, this.actorGroup, new THREE.Vector3(1, 0, 0), raisePitch);
      rotateBoneAroundActorAxis(this.bones.Tail_2, this.actorGroup, new THREE.Vector3(0, 1, 0), sideSign * 0.75);
    }

    // 6. Grooming paw-lick & P3 cozy cushion kneading overlays
    if (this.pose === 'groom') {
      const lick = Math.sin(this.elapsed * 5.2);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.95 - lick * 0.18);
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.45 + lick * 0.2);
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.24 + lick * 0.1);
    } else if (this.pose === 'knead') {
      const phase = this.elapsed * 4.4;
      const leftLift = Math.max(0, Math.sin(phase));
      const rightLift = Math.max(0, -Math.sin(phase));
      rotateBoneAroundActorAxis(this.bones.Spine, this.actorGroup, new THREE.Vector3(0, 0, 1), Math.sin(phase) * 0.06);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.44 * leftLift + 0.08 * (1 - leftLift));
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.34 * leftLift);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.44 * rightLift + 0.08 * (1 - rightLift));
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.34 * rightLift);
    }

    // 7. Interactive Analytical Front-Paw IK Swipe (targets live 3D ball/yarn/wand coordinates!)
    if (this.pawSwipe.active) {
      const p = THREE.MathUtils.clamp(this.pawSwipe.progress, 0, 1);
      const isLeft = this.pawSwipe.side === 'L';
      const upperActive = isLeft ? this.bones.FrontUpperLeg_L : this.bones.FrontUpperLeg_R;
      const lowerActive = isLeft ? this.bones.FrontLowerLeg_L : this.bones.FrontLowerLeg_R;
      const upperSupport = isLeft ? this.bones.FrontUpperLeg_R : this.bones.FrontUpperLeg_L;

      let weight = 0;
      let anticipation = 0;
      if (this.pose === 'jump') {
        // Mid-air wand pounce swipe peaks cleanly around jump apex
        weight = Math.sin(p * Math.PI);
      } else if (p < 0.32) {
        anticipation = THREE.MathUtils.smoothstep(p / 0.32, 0, 1);
      } else if (p < 0.64) {
        const k = THREE.MathUtils.smoothstep((p - 0.32) / 0.24, 0, 1);
        weight = k;
        anticipation = 1 - k;
      } else {
        weight = 1 - THREE.MathUtils.smoothstep((p - 0.64) / 0.36, 0, 1);
      }

      solveVuenaFrontPawIk({
        actorGroup: this.actorGroup,
        spine: this.bones.Spine,
        upperActive,
        lowerActive,
        upperSupport,
        targetWorld: this.pawSwipe.targetWorld,
        side: this.pawSwipe.side,
        weight,
        anticipation,
      });
    }

    // 8. Smooth Side-Roll Yarn Hug + Rhythmic Alternating Hind-Leg Bunny Kick (zero death clip)
    if (this.hugKick.active || this.hugRollCur > 0.02) {
      const r = this.hugKick.active ? Math.max(0.2, this.hugRollCur) : this.hugRollCur;
      const kick = Math.sin(this.hugKick.phase * 16);
      rotateBoneAroundActorAxis(this.bones.Spine, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.24 * r);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.78 * r);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(0, 0, 1), -0.3 * r);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.78 * r);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_R, this.actorGroup, new THREE.Vector3(0, 0, 1), 0.3 * r);
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.42 * r);
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.42 * r);

      // Rhythmic alternating hind-leg bunny kicks against the hugged yarn
      rotateBoneAroundActorAxis(this.bones.BackUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), (-0.52 + kick * 0.56) * r);
      rotateBoneAroundActorAxis(this.bones.BackUpperLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), (-0.52 - kick * 0.56) * r);
      rotateBoneAroundActorAxis(this.bones.BackLowerLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), (0.42 - kick * 0.44) * r);
      rotateBoneAroundActorAxis(this.bones.BackLowerLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), (0.42 + kick * 0.44) * r);
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.animRoot);
  }
}
