import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HALF_H_3D, HALF_W_3D } from '../../../shared/billiards/physics3dEngine';
import type { Billiards3DShotCameraMode } from './touchPreferences';

export type Billiards3DCamMode = 'follow' | 'top' | 'orbit';
export type Billiards3DCameraStage =
  | 'aiming'
  | 'shot_transition'
  | 'tracking'
  | 'overview'
  | 'manual_override';

export interface CameraPoseInput {
  mode: Billiards3DCamMode;
  shotCameraMode?: Billiards3DShotCameraMode;
  cameraStage?: Billiards3DCameraStage;
  aspect: number;
  zoomLevel: number;
  visualAimAngle: number;
  cueX: number;
  cueZ: number;
  cuePocketed: boolean;
  phase: 'aim' | 'moving' | 'gameOver';
  isStriking: boolean;
  draggingCueBall: boolean;
  hoverZoomActive: boolean;
  hoverWorldPt: { x: number; z: number } | null;
  focusedBallId?: number | null;
  focusedBallPos?: { x: number; z: number } | null;
}

export interface ComputedCameraPose {
  position: [number, number, number];
  lookAt: [number, number, number];
  up: [number, number, number];
  fov: number;
}

/**
 * Computes aspect-aware full-table Tactical Overview camera pose that frames
 * the complete playable felt, wood rails, and all six pockets inside HUD safe margins.
 */
export function computeTacticalOverviewPose3D(aspect: number): ComputedCameraPose {
  const safeAspect = Math.max(0.4, aspect || 1);
  const isPortrait = safeAspect < 0.85;
  const fov = isPortrait ? 54 : 44;
  const vHalfTan = Math.tan((fov * Math.PI) / 360);
  const hHalfTan = vHalfTan * safeAspect;

  const halfSpanX = HALF_W_3D + (isPortrait ? 0.19 : 0.24);
  const halfSpanZ = HALF_H_3D + (isPortrait ? 0.23 : 0.19);

  const reqHeight = isPortrait
    ? Math.max(halfSpanX / vHalfTan, halfSpanZ / hHalfTan)
    : Math.max(halfSpanX / hHalfTan, halfSpanZ / vHalfTan);

  const height = Math.max(2.65, Math.min(4.8, reqHeight));
  return {
    position: [0, height, isPortrait ? 0 : 0.01],
    lookAt: [0, 0, 0],
    up: isPortrait ? [1, 0, 0] : [0, 1, 0],
    fov,
  };
}

export function shortestAngleDelta3D(fromAngle: number, toAngle: number): number {
  let diff = (toAngle - fromAngle) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff <= -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function smoothFactor(rate: number, dt: number): number {
  return 1 - Math.exp(-Math.max(0, rate) * Math.max(0, Math.min(0.1, dt)));
}

/**
 * Computes deterministic, aspect-aware target camera pose for Follow, Top-Down (portrait vertical aware),
 * and Magnifier hover modes without modifying OrbitControls state.
 */
export function computeCameraPose3D(input: CameraPoseInput): ComputedCameraPose {
  const safeAspect = Math.max(0.4, input.aspect || 1);
  const isPortrait = safeAspect < 0.85;
  const clampedZoom = Math.max(0.65, Math.min(2.8, input.zoomLevel));
  const zFactor = 1 / clampedZoom;
  const baseFov = isPortrait ? 54 : 44;

  if (
    input.hoverZoomActive &&
    input.hoverWorldPt &&
    input.phase === 'aim' &&
    !input.draggingCueBall
  ) {
    const hx = Math.max(-HALF_W_3D, Math.min(HALF_W_3D, input.hoverWorldPt.x));
    const hz = Math.max(-HALF_H_3D, Math.min(HALF_H_3D, input.hoverWorldPt.z));
    if (input.mode === 'top') {
      return {
        position: [hx, 1.05, isPortrait ? hz : hz + 0.01],
        lookAt: [hx, 0.02, hz],
        up: isPortrait ? [1, 0, 0] : [0, 1, 0],
        fov: baseFov,
      };
    }
    return {
      position: [
        hx - Math.cos(input.visualAimAngle) * 0.58,
        0.42,
        hz - Math.sin(input.visualAimAngle) * 0.58,
      ],
      lookAt: [hx, 0.03, hz],
      up: [0, 1, 0],
      fov: baseFov,
    };
  }

  // Automatic Tactical Overview during active shot / post-shot hold (when not overridden manually)
  if (
    !input.draggingCueBall &&
    !input.hoverZoomActive &&
    (input.cameraStage === 'shot_transition' ||
      input.cameraStage === 'tracking' ||
      input.cameraStage === 'overview')
  ) {
    if (clampedZoom <= 1.05 || input.phase === 'moving') {
      return computeTacticalOverviewPose3D(safeAspect);
    }
    const overview = computeTacticalOverviewPose3D(safeAspect);
    const zoomAnchor = input.focusedBallPos ?? input.hoverWorldPt;
    const focusX = zoomAnchor
      ? Math.max(-HALF_W_3D * 0.85, Math.min(HALF_W_3D * 0.85, zoomAnchor.x)) * (1 - zFactor)
      : 0;
    const focusZ = zoomAnchor
      ? Math.max(-HALF_H_3D * 0.85, Math.min(HALF_H_3D * 0.85, zoomAnchor.z)) * (1 - zFactor)
      : 0;
    return {
      position: [focusX, overview.position[1] * zFactor, isPortrait ? focusZ : focusZ + 0.01],
      lookAt: [focusX, 0, focusZ],
      up: overview.up,
      fov: overview.fov,
    };
  }

  if (input.mode === 'top' || input.draggingCueBall) {
    const zoomAnchor = input.hoverWorldPt ?? input.focusedBallPos;
    const overview = computeTacticalOverviewPose3D(safeAspect);
    const focusX =
      clampedZoom > 1.05 && zoomAnchor && !input.draggingCueBall
        ? Math.max(-HALF_W_3D * 0.85, Math.min(HALF_W_3D * 0.85, zoomAnchor.x)) * (1 - zFactor)
        : 0;
    const focusZ =
      clampedZoom > 1.05 && zoomAnchor && !input.draggingCueBall
        ? Math.max(-HALF_H_3D * 0.85, Math.min(HALF_H_3D * 0.85, zoomAnchor.z)) * (1 - zFactor)
        : 0;
    const topHeight = overview.position[1] * zFactor;
    return {
      position: [focusX, topHeight, isPortrait ? focusZ : focusZ + 0.01],
      lookAt: [focusX, 0, focusZ],
      up: overview.up,
      fov: overview.fov,
    };
  }

  if (
    input.mode === 'follow' &&
    !input.cuePocketed &&
    (input.phase === 'aim' || input.isStriking)
  ) {
    if (
      input.focusedBallId !== undefined &&
      input.focusedBallId !== null &&
      input.focusedBallId !== 0 &&
      input.focusedBallPos &&
      input.phase === 'aim' &&
      !input.isStriking
    ) {
      const fdx = input.focusedBallPos.x - input.cueX;
      const fdz = input.focusedBallPos.z - input.cueZ;
      const fDist = Math.hypot(fdx, fdz);
      const fAngle = fDist > 0.05 ? Math.atan2(fdz, fdx) : input.visualAimAngle;
      const focusPullback = (isPortrait ? 1.15 : 0.98) * zFactor;
      const focusHeight = Math.max(0.38, (isPortrait ? 0.78 : 0.65) * zFactor);
      return {
        position: [
          input.focusedBallPos.x - Math.cos(fAngle) * focusPullback,
          focusHeight,
          input.focusedBallPos.z - Math.sin(fAngle) * focusPullback,
        ],
        lookAt: [input.focusedBallPos.x, 0.03, input.focusedBallPos.z],
        up: [0, 1, 0],
        fov: baseFov,
      };
    }
    const distBack = (isPortrait ? 1.48 : 1.25) * zFactor;
    const camHeight = Math.max(0.26, (isPortrait ? 0.74 : 0.62) * zFactor);
    return {
      position: [
        input.cueX - Math.cos(input.visualAimAngle) * distBack,
        camHeight,
        input.cueZ - Math.sin(input.visualAimAngle) * distBack,
      ],
      lookAt: [
        input.cueX + Math.cos(input.visualAimAngle) * 0.45,
        0.03,
        input.cueZ + Math.sin(input.visualAimAngle) * 0.45,
      ],
      up: [0, 1, 0],
      fov: baseFov,
    };
  }

  // Fallback high observation pose when balls are moving in follow mode
  const r = (isPortrait ? 3.15 : 2.65) * zFactor;
  return {
    position: [0, r * 0.72, r * 0.75],
    lookAt: [0, 0, 0],
    up: [0, 1, 0],
    fov: baseFov,
  };
}

/**
 * Independent 3D Camera Controller for Billiards 3D:
 * - Strictly owns `Three.js OrbitControls` during `'orbit'` mode and disables it during `'follow'` / `'top'`.
 * - Uses continuous quaternion slerp (`camera.quaternion.slerp`) + exponential frame-rate-independent smoothing
 *   and shortest-angle aim interpolation so camera mode changes & touch drags never snap or flip `camera.up`.
 */
export class Billiards3DCameraController {
  readonly controls: OrbitControls;
  private readonly camera: THREE.PerspectiveCamera;
  private visualAimAngle = 0;
  private lastMode: Billiards3DCamMode = 'follow';
  private orbitBlendRemaining = 0;
  private orbitTargetGoal: THREE.Vector3 | null = null;
  private readonly targetPos = new THREE.Vector3();
  private readonly targetLook = new THREE.Vector3();
  private readonly targetUp = new THREE.Vector3(0, 1, 0);
  private readonly targetQuat = new THREE.Quaternion();
  private readonly lookMatrix = new THREE.Matrix4();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, initialAimAngle = 0) {
    this.camera = camera;
    this.visualAimAngle = initialAimAngle;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.085;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 0.95;
    this.controls.maxDistance = 4.4;
    this.controls.minPolarAngle = 0.16;
    this.controls.maxPolarAngle = 1.32;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.enabled = false;
  }

  setSensitivity(rotateSpeed: number, zoomSpeed: number): void {
    this.controls.rotateSpeed = Math.max(0.05, Math.min(2.5, rotateSpeed));
    this.controls.zoomSpeed = Math.max(0.05, Math.min(2.5, zoomSpeed));
  }

  focusOrbitTarget(pos: { x: number; z: number } | null): void {
    if (!pos) {
      this.orbitTargetGoal = new THREE.Vector3(0, 0, 0);
    } else {
      this.orbitTargetGoal = new THREE.Vector3(pos.x, 0.03, pos.z);
    }
  }

  snapInitialPose(input: CameraPoseInput): void {
    this.visualAimAngle = input.visualAimAngle;
    this.lastMode = input.mode;
    const pose = computeCameraPose3D(input);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(...pose.position);
    this.targetLook.set(...pose.lookAt);
    this.targetUp.set(...pose.up);
    this.lookMatrix.lookAt(this.camera.position, this.targetLook, this.targetUp);
    this.camera.quaternion.setFromRotationMatrix(this.lookMatrix);
    this.camera.up.copy(this.targetUp);
    this.controls.target.copy(this.targetLook);
  }

  update(dt: number, authoritativeAimAngle: number, rawInput: Omit<CameraPoseInput, 'visualAimAngle'> & { gestureBlocked?: boolean }): void {
    // Shortest-angle smoothing of visual cue follow angle (unaffected by jittery touch events)
    const diff = shortestAngleDelta3D(this.visualAimAngle, authoritativeAimAngle);
    this.visualAimAngle += diff * smoothFactor(14, dt);

    const automaticStageOverride =
      rawInput.cameraStage === 'shot_transition' ||
      rawInput.cameraStage === 'tracking' ||
      rawInput.cameraStage === 'overview';
    const effectiveMode: Billiards3DCamMode = automaticStageOverride ? 'top' : rawInput.mode;

    const enteringOrbit = effectiveMode === 'orbit' && this.lastMode !== 'orbit';
    const leavingOrbit = effectiveMode !== 'orbit' && this.lastMode === 'orbit';
    this.lastMode = effectiveMode;

    if (enteringOrbit) {
      // Smoothly transition into an ergonomic table orbit view without snapping camera.up
      this.camera.up.set(0, 1, 0);
      this.controls.target.set(0, 0, 0);
      this.orbitBlendRemaining = 0.28;
      this.controls.enabled = false;
    } else if (leavingOrbit) {
      this.orbitBlendRemaining = 0;
      this.controls.enabled = false;
    }

    if (effectiveMode === 'orbit' && !rawInput.draggingCueBall && !rawInput.hoverZoomActive) {
      const targetFov = rawInput.aspect < 0.85 ? 54 : 44;
      if (Math.abs(this.camera.fov - targetFov) > 0.02) {
        this.camera.fov += (targetFov - this.camera.fov) * smoothFactor(8, dt);
        this.camera.updateProjectionMatrix();
      }
      if (this.orbitBlendRemaining > 0) {
        this.orbitBlendRemaining = Math.max(0, this.orbitBlendRemaining - dt);
        const zFactor = 1 / Math.max(0.65, Math.min(2.8, rawInput.zoomLevel));
        const r = (rawInput.aspect < 0.85 ? 2.95 : 2.45) * zFactor;
        this.targetPos.set(
          Math.cos(0.6) * Math.cos(0.68) * r,
          Math.sin(0.68) * r + 0.12,
          Math.sin(0.6) * Math.cos(0.68) * r,
        );
        if (rawInput.focusedBallId && rawInput.focusedBallId !== 0 && rawInput.focusedBallPos) {
          this.targetLook.set(rawInput.focusedBallPos.x, 0.03, rawInput.focusedBallPos.z);
        } else {
          this.targetLook.set(0, 0, 0);
        }
        this.targetUp.set(0, 1, 0);
        this.lookMatrix.lookAt(this.targetPos, this.targetLook, this.targetUp);
        this.targetQuat.setFromRotationMatrix(this.lookMatrix);
        const a = smoothFactor(10, dt);
        this.camera.position.lerp(this.targetPos, a);
        this.camera.quaternion.slerp(this.targetQuat, a);
        if (this.orbitBlendRemaining <= 0) {
          this.controls.target.copy(this.targetLook);
          this.controls.update();
        }
        return;
      }
      if (this.orbitTargetGoal && !rawInput.gestureBlocked) {
        this.controls.target.lerp(this.orbitTargetGoal, smoothFactor(10, dt));
        if (this.controls.target.distanceTo(this.orbitTargetGoal) < 0.004) {
          this.controls.target.copy(this.orbitTargetGoal);
          this.orbitTargetGoal = null;
        }
      } else if (rawInput.gestureBlocked) {
        // Player started manual OrbitControls interaction; yield target control immediately
        this.orbitTargetGoal = null;
      }
      this.controls.enabled = !rawInput.gestureBlocked;
      this.controls.update();
      return;
    }

    // Strict ownership: OrbitControls is disabled during Follow / Top / Ball-in-Hand
    this.controls.enabled = false;

    const pose = computeCameraPose3D({
      ...rawInput,
      visualAimAngle: this.visualAimAngle,
    });
    this.targetPos.set(...pose.position);
    this.targetLook.set(...pose.lookAt);
    this.targetUp.set(...pose.up);

    if (Math.abs(this.camera.fov - pose.fov) > 0.02) {
      this.camera.fov += (pose.fov - this.camera.fov) * smoothFactor(8, dt);
      this.camera.updateProjectionMatrix();
    }

    this.lookMatrix.lookAt(this.targetPos, this.targetLook, this.targetUp);
    this.targetQuat.setFromRotationMatrix(this.lookMatrix);

    const alpha = smoothFactor(
      effectiveMode === 'top' || automaticStageOverride ? 8.5 : 10,
      dt,
    );
    this.camera.position.lerp(this.targetPos, alpha);
    this.camera.quaternion.slerp(this.targetQuat, alpha);
  }

  dispose(): void {
    this.controls.dispose();
  }
}
