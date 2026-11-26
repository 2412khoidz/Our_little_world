import * as THREE from 'three';
import type { PetCareTailMode } from '../../../shared/petLiving/petCare/petCareTypes';
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
  if (pose === 'paw_bat' || pose === 'attack') {
    return { clip: 'attack', timeScale: 1.5, loopOnce: false, fadeSec: 0.08 };
  }
  if (pose === 'hug_kick' || pose === 'belly') {
    return { clip: 'death', timeScale: 1.0, loopOnce: true, fadeSec: 0.22, clampTimeSec: 0.62 };
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

/** Smooth closed-eyelid local translation delta observed in `vuena-cat.glb` (sleep / hit frames). */
const VUENA_LIDS_CLOSED_DELTA = new THREE.Vector3(0, 0.046, 0.021);

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
  private lidCur = 0;
  private blinkTimer = 2.6;
  private blinkAmount = 0;
  private wagPhase = 0;
  private readonly restLidsPos = new THREE.Vector3(0, 0, 0);
  private readonly restHipsPos = new THREE.Vector3(0, 0, 0);

  constructor(
    private readonly actorGroup: THREE.Group,
    private readonly animRoot: THREE.Object3D,
    clips: THREE.AnimationClip[],
    private readonly bones: Record<string, THREE.Bone>,
  ) {
    this.mixer = new THREE.AnimationMixer(animRoot);
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

    // Apply vertical jump lift & lean cleanly on animation root
    this.animRoot.position.y = this.rootLift;
    this.animRoot.rotation.z = this.rootRoll;

    this.applyAdditiveOverlays(dt);
  }

  private applyAdditiveOverlays(dt: number): void {
    this.actorGroup.updateMatrixWorld(true);

    // 1. Blink + Happy ^^ Lids overlay (only override Lids when open or blinking/happy, let sleep clip handle sleep)
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkAmount = 1;
      this.blinkTimer = 2.4 + Math.random() * 3.2;
    }
    this.blinkAmount = Math.max(0, this.blinkAmount - dt * 6.5);
    const wantLid = this.pose === 'sleep' ? 0 : Math.max(this.eyesClosed, this.happy > 0.65 ? 0.72 : 0, this.blinkAmount);
    this.lidCur += (wantLid - this.lidCur) * (1 - Math.exp(-16 * dt));
    if (this.bones.Lids && this.pose !== 'sleep') {
      this.bones.Lids.position.copy(this.restLidsPos).addScaledVector(VUENA_LIDS_CLOSED_DELTA, THREE.MathUtils.clamp(this.lidCur, 0, 1));
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

    if (this.bones.Neck) {
      rotateBoneAroundActorAxis(this.bones.Neck, this.actorGroup, new THREE.Vector3(0, 1, 0), (this.lookYaw + ovYaw) * 0.42);
      rotateBoneAroundActorAxis(this.bones.Neck, this.actorGroup, new THREE.Vector3(1, 0, 0), (this.lookPitch + ovPitch) * 0.35);
    }
    if (this.bones.Head) {
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(0, 1, 0), (this.lookYaw + ovYaw) * 0.58);
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(1, 0, 0), (this.lookPitch + ovPitch) * 0.55);
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(0, 0, 1), this.headTiltCur + ovRoll);
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

    // 6. Grooming paw-lick additive gesture when sitting in groom pose
    if (this.pose === 'groom') {
      const lick = Math.sin(this.elapsed * 5.2);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.95 - lick * 0.18);
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.45 + lick * 0.2);
      rotateBoneAroundActorAxis(this.bones.Head, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.24 + lick * 0.1);
    }

    // 7. Interactive Front-Paw Raise & Bat Swipe (for ball, yarn, wand!)
    if (this.pawSwipe.active) {
      const p = THREE.MathUtils.clamp(this.pawSwipe.progress, 0, 1);
      const isLeft = this.pawSwipe.side === 'L';
      const upper = isLeft ? this.bones.FrontUpperLeg_L : this.bones.FrontUpperLeg_R;
      const lower = isLeft ? this.bones.FrontLowerLeg_L : this.bones.FrontLowerLeg_R;

      // 0..0.42 raise high (lift up + forward), 0.42..0.65 crisp strike swing down/forward, 0.65..1 recover
      let raiseAngle: number;
      let reachAngle: number;
      let sweepSide = 0;
      if (p < 0.42) {
        const k = THREE.MathUtils.smoothstep(p / 0.42, 0, 1);
        raiseAngle = -1.18 * k;
        reachAngle = -0.35 * k;
      } else if (p < 0.65) {
        const k = THREE.MathUtils.smoothstep((p - 0.42) / 0.23, 0, 1);
        raiseAngle = THREE.MathUtils.lerp(-1.18, -0.52, k);
        reachAngle = THREE.MathUtils.lerp(-0.35, 0.35, k);
        sweepSide = (isLeft ? -0.35 : 0.35) * k;
      } else {
        const k = 1 - THREE.MathUtils.smoothstep((p - 0.65) / 0.35, 0, 1);
        raiseAngle = -0.52 * k;
        reachAngle = 0.35 * k;
        sweepSide = (isLeft ? -0.35 : 0.35) * k;
      }

      rotateBoneAroundActorAxis(upper, this.actorGroup, new THREE.Vector3(1, 0, 0), raiseAngle);
      rotateBoneAroundActorAxis(upper, this.actorGroup, new THREE.Vector3(0, 1, 0), sweepSide);
      rotateBoneAroundActorAxis(lower, this.actorGroup, new THREE.Vector3(1, 0, 0), reachAngle);
    }

    // 8. Toy Hug (both front paws inward) + Bunny-Kick (rapid alternating hind legs!)
    if (this.hugKick.active) {
      const kick = Math.sin(this.hugKick.phase * 18);
      // Hug toy inward with both front paws
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.68);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_L, this.actorGroup, new THREE.Vector3(0, 0, 1), -0.32);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.68);
      rotateBoneAroundActorAxis(this.bones.FrontUpperLeg_R, this.actorGroup, new THREE.Vector3(0, 0, 1), 0.32);
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.35);
      rotateBoneAroundActorAxis(this.bones.FrontLowerLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.35);

      // Bunny kick hind legs playfully
      rotateBoneAroundActorAxis(this.bones.BackUpperLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.55 + kick * 0.55);
      rotateBoneAroundActorAxis(this.bones.BackUpperLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), -0.55 - kick * 0.55);
      rotateBoneAroundActorAxis(this.bones.BackLowerLeg_L, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.45 - kick * 0.45);
      rotateBoneAroundActorAxis(this.bones.BackLowerLeg_R, this.actorGroup, new THREE.Vector3(1, 0, 0), 0.45 + kick * 0.45);
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.animRoot);
  }
}
