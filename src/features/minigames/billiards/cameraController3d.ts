import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  HALF_H_3D,
  HALF_W_3D,
  POCKETS_3D,
  type Ball3DState,
} from '../../../shared/billiards/physics3dEngine';
import type { Billiards3DShotCameraMode } from './touchPreferences';

export type Billiards3DCamMode = 'follow' | 'top' | 'orbit';
export type Billiards3DCameraStage =
  | 'aiming'
  | 'shot_transition'
  | 'tracking'
  | 'overview'
  | 'manual_override';

export interface AdaptivePocketEvent {
  id: number;
  x: number;
  z: number;
  atMs: number;
}

export interface AdaptiveShotContext {
  isBreakShot: boolean;
  intendedTargetId: number | null;
  firstContactId: number | null;
  shotAimAngle: number;
  cueStopGraceUntilMs: number;
  firstContactGraceUntilMs: number;
  recentPockets: readonly AdaptivePocketEvent[];
  nowMs: number;
}

export interface AdaptiveFramingRegion {
  cx: number;
  cz: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  spanX: number;
  spanZ: number;
  targetDistance: number;
  targetElevationRad: number;
  targetAzimuthRad: number;
  targetHeight: number;
  fullTable: boolean;
  valid: boolean;
}

export interface AdaptiveSmootherState {
  initialized: boolean;
  cx: number;
  cz: number;
  distance: number;
  elevationRad: number;
  azimuthRad: number;
  height: number;
  holdWideUntilMs: number;
}

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
  balls?: readonly Ball3DState[];
  adaptiveContext?: AdaptiveShotContext | null;
}

export interface ComputedCameraPose {
  position: [number, number, number];
  lookAt: [number, number, number];
  up: [number, number, number];
  fov: number;
}

const DEG_TO_RAD = Math.PI / 180;

export function createAdaptiveSmootherState(): AdaptiveSmootherState {
  return {
    initialized: false,
    cx: 0,
    cz: 0,
    distance: 2.6,
    elevationRad: 50 * DEG_TO_RAD,
    azimuthRad: Math.PI + 0.16,
    height: 2.6 * Math.sin(50 * DEG_TO_RAD),
    holdWideUntilMs: 0,
  };
}

/**
 * Computes the elevation angle (degrees above horizontal XZ table plane) of any camera pose.
 * 0° = level on felt, 45° = diagonal oblique 3D, 90° = vertical overhead 2D-style view.
 */
export function computePoseElevationDeg(pose: ComputedCameraPose): number {
  const dx = pose.position[0] - pose.lookAt[0];
  const dy = pose.position[1] - pose.lookAt[1];
  const dz = pose.position[2] - pose.lookAt[2];
  const horiz = Math.hypot(dx, dz);
  return Math.atan2(Math.max(0, dy), Math.max(1e-6, horiz)) * (180 / Math.PI);
}

/**
 * Selects a stable oblique broadcast viewing azimuth from the shooter's aim angle & viewport aspect,
 * preserving natural 3D perspective without dizzying rotations mid-shot.
 */
export function computeObliqueShotAzimuth3D(
  aimAngle: number,
  aspect: number,
  wideFullTable = false,
): number {
  const safeAspect = Math.max(0.4, aspect || 1);
  const isPortrait = safeAspect < 0.85;

  if (isPortrait) {
    const aimingPosX = Math.cos(aimAngle) >= 0;
    const baseEnd = aimingPosX ? Math.PI : 0;
    const rawRel = shortestAngleDelta3D(aimingPosX ? 0 : Math.PI, aimAngle);
    const maxDiag = wideFullTable ? 0.12 : 0.28;
    const minDiag = wideFullTable ? 0.08 : 0.14;
    const sideSign = rawRel >= 0 ? -1 : 1;
    const mag = Math.max(minDiag, Math.min(maxDiag, Math.abs(rawRel) * 0.45 + 0.1));
    return baseEnd + sideSign * mag;
  }

  const shooterOffset = Math.cos(aimAngle) >= 0 ? 1 : -1;
  const diag = wideFullTable ? 0.16 : 0.24;
  return Math.PI * 0.5 + shooterOffset * diag;
}

/**
 * Exact perspective-frustum fitter for an oblique elevated 3D camera (`up = [0, 1, 0]`).
 * Projects all ROI bounding corners into camera space `(right, camUp, forward)` and solves
 * the minimum camera distance `D` so no corner clips past the HUD safe margins.
 */
export function fitBoxInObliqueFrustum3D(params: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cz: number;
  elevationRad: number;
  azimuthRad: number;
  fovDeg: number;
  aspect: number;
  safeFracX?: number;
  safeFracY?: number;
}): number {
  const safeAspect = Math.max(0.4, params.aspect || 1);
  const cosE = Math.cos(params.elevationRad);
  const sinE = Math.sin(params.elevationRad);
  const cosA = Math.cos(params.azimuthRad);
  const sinA = Math.sin(params.azimuthRad);

  const fx = -cosE * cosA;
  const fy = -sinE;
  const fz = -cosE * sinA;

  const rx = sinA;
  const rz = -cosA;

  const ux = -sinE * cosA;
  const uy = cosE;
  const uz = -sinE * sinA;

  const tanV = Math.tan(params.fovDeg * DEG_TO_RAD * 0.5);
  const tanH = tanV * safeAspect;
  const safeX = params.safeFracX ?? (safeAspect < 0.85 ? 0.84 : 0.86);
  const safeY = params.safeFracY ?? (safeAspect < 0.85 ? 0.78 : 0.78);
  const denomX = Math.max(0.05, safeX * tanH);
  const denomY = Math.max(0.05, safeY * tanV);

  const xs = [params.minX, params.maxX];
  const zs = [params.minZ, params.maxZ];
  const ys = [0.0, 0.06];
  const cy = 0.02;

  let reqDist = 1.65;
  for (let xi = 0; xi < 2; xi++) {
    const px = xs[xi]!;
    for (let zi = 0; zi < 2; zi++) {
      const pz = zs[zi]!;
      for (let yi = 0; yi < 2; yi++) {
        const py = ys[yi]!;
        const dx = px - params.cx;
        const dy = py - cy;
        const dz = pz - params.cz;
        const u = dx * rx + dz * rz;
        const v = dx * ux + dy * uy + dz * uz;
        const w = dx * fx + dy * fy + dz * fz;
        const dH = Math.abs(u) / denomX - w;
        const dV = Math.abs(v) / denomY - w;
        if (dH > reqDist) reqDist = dH;
        if (dV > reqDist) reqDist = dV;
      }
    }
  }
  return Math.max(1.6, Math.min(5.2, reqDist));
}

function composeObliquePose(
  cx: number,
  cz: number,
  distance: number,
  elevationRad: number,
  azimuthRad: number,
  fov: number,
): ComputedCameraPose {
  const cosE = Math.cos(elevationRad);
  const sinE = Math.sin(elevationRad);
  const horiz = distance * cosE;
  return {
    position: [
      cx + Math.cos(azimuthRad) * horiz,
      0.02 + distance * sinE,
      cz + Math.sin(azimuthRad) * horiz,
    ],
    lookAt: [cx, 0.02, cz],
    up: [0, 1, 0],
    fov,
  };
}

/**
 * Computes a genuine elevated OBLIQUE 3D full-table overview pose (`52°–56°` elevation,
 * `up = [0, 1, 0]`) framing all six pockets and mahogany rails with clear 3D perspective.
 */
export function computeObliqueOverviewPose3D(
  aspect: number,
  preferredAimAngle = 0,
): ComputedCameraPose {
  const safeAspect = Math.max(0.4, aspect || 1);
  const isPortrait = safeAspect < 0.85;
  const fov = isPortrait ? 55 : 44;
  const elevationRad = (isPortrait ? 56 : 52) * DEG_TO_RAD;
  const azimuthRad = computeObliqueShotAzimuth3D(preferredAimAngle, safeAspect, true);
  const dist = fitBoxInObliqueFrustum3D({
    minX: -HALF_W_3D - 0.12,
    maxX: HALF_W_3D + 0.12,
    minZ: -HALF_H_3D - 0.12,
    maxZ: HALF_H_3D + 0.12,
    cx: 0,
    cz: 0,
    elevationRad,
    azimuthRad,
    fovDeg: fov,
    aspect: safeAspect,
    safeFracX: isPortrait ? 0.86 : 0.88,
    safeFracY: isPortrait ? 0.8 : 0.8,
  });
  return composeObliquePose(0, 0, dist, elevationRad, azimuthRad, fov);
}

/**
 * Pure linear-time (`O(16)`) Adaptive Cinematic ROI & oblique 3D perspective calculation.
 * Preserves elevated oblique 3D framing (`42°–66°`) across single-ball tracking, multi-ball
 * collisions, pocket approaches, scratch awareness, and break shots — never flattening to 90° 2D.
 */
export function computeAdaptiveFramingRegion3D(
  balls: readonly Ball3DState[] | undefined,
  ctx: AdaptiveShotContext | null | undefined,
  aspect: number,
): AdaptiveFramingRegion {
  const safeAspect = Math.max(0.4, aspect || 1);
  const isPortrait = safeAspect < 0.85;
  const fov = isPortrait ? 55 : 44;
  const aimAngle = ctx?.shotAimAngle ?? 0;

  const buildFullTableOblique = (elevDeg: number, valid: boolean): AdaptiveFramingRegion => {
    const elevationRad = elevDeg * DEG_TO_RAD;
    const azimuthRad = computeObliqueShotAzimuth3D(aimAngle, safeAspect, true);
    const minX = -HALF_W_3D - 0.12;
    const maxX = HALF_W_3D + 0.12;
    const minZ = -HALF_H_3D - 0.12;
    const maxZ = HALF_H_3D + 0.12;
    const dist = fitBoxInObliqueFrustum3D({
      minX,
      maxX,
      minZ,
      maxZ,
      cx: 0,
      cz: 0,
      elevationRad,
      azimuthRad,
      fovDeg: fov,
      aspect: safeAspect,
      safeFracX: isPortrait ? 0.86 : 0.88,
      safeFracY: isPortrait ? 0.8 : 0.8,
    });
    return {
      cx: 0,
      cz: 0,
      minX,
      maxX,
      minZ,
      maxZ,
      spanX: maxX - minX,
      spanZ: maxZ - minZ,
      targetDistance: dist,
      targetElevationRad: elevationRad,
      targetAzimuthRad: azimuthRad,
      targetHeight: 0.02 + dist * Math.sin(elevationRad),
      fullTable: true,
      valid,
    };
  };

  if (!balls || balls.length === 0 || !ctx) {
    return buildFullTableOblique(isPortrait ? 56 : 52, false);
  }

  let movingCount = 0;
  let mMinX = Infinity;
  let mMaxX = -Infinity;
  let mMinZ = Infinity;
  let mMaxZ = -Infinity;

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]!;
    if (!Number.isFinite(b.x) || !Number.isFinite(b.z)) {
      return buildFullTableOblique(isPortrait ? 56 : 52, false);
    }
    if (b.pocketed && !b.falling) continue;
    const spdSq = b.vx * b.vx + b.vz * b.vz;
    if (b.falling || spdSq > 0.032 * 0.032) {
      movingCount++;
      if (b.x < mMinX) mMinX = b.x;
      if (b.x > mMaxX) mMaxX = b.x;
      if (b.z < mMinZ) mMinZ = b.z;
      if (b.z > mMaxZ) mMaxZ = b.z;
    }
  }

  if (ctx.isBreakShot) {
    return buildFullTableOblique(isPortrait ? 64 : 60, true);
  }

  const widespreadScatter =
    movingCount >= 5 || (movingCount >= 2 && mMaxX - mMinX > 1.72 && mMaxZ - mMinZ > 0.84);
  if (widespreadScatter) {
    return buildFullTableOblique(isPortrait ? 60 : 56, true);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let count = 0;

  const includePt = (px: number, pz: number) => {
    if (!Number.isFinite(px) || !Number.isFinite(pz)) return;
    const cx = Math.max(-HALF_W_3D - 0.1, Math.min(HALF_W_3D + 0.1, px));
    const cz = Math.max(-HALF_H_3D - 0.1, Math.min(HALF_H_3D + 0.1, pz));
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cz < minZ) minZ = cz;
    if (cz > maxZ) maxZ = cz;
    count++;
  };

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i]!;
    const spd = Math.hypot(b.vx, b.vz);
    const isMoving = !b.pocketed && (b.falling || spd > 0.032);

    const isCueRetained =
      b.id === 0 &&
      !b.pocketed &&
      (ctx.firstContactId === null || ctx.nowMs <= ctx.cueStopGraceUntilMs);

    const isIntendedPreContact =
      ctx.firstContactId === null &&
      ctx.intendedTargetId !== null &&
      b.id === ctx.intendedTargetId &&
      !b.pocketed;

    const isActualContact =
      ctx.firstContactId !== null &&
      b.id === ctx.firstContactId &&
      !b.pocketed &&
      ctx.nowMs <= ctx.firstContactGraceUntilMs;

    if (isMoving || isCueRetained || isIntendedPreContact || isActualContact) {
      includePt(b.x, b.z);
      if (isMoving && !b.falling) {
        const lookX = Math.max(-0.28, Math.min(0.28, b.vx * 0.18));
        const lookZ = Math.max(-0.28, Math.min(0.28, b.vz * 0.18));
        includePt(b.x + lookX, b.z + lookZ);
      }
    }

    if (isMoving && spd > 0.06 && !b.falling) {
      for (let pi = 0; pi < POCKETS_3D.length; pi++) {
        const pocket = POCKETS_3D[pi]!;
        const pdx = pocket.x - b.x;
        const pdz = pocket.z - b.z;
        const pDist = Math.hypot(pdx, pdz);
        if (pDist < 0.66) {
          const align = (b.vx * pdx + b.vz * pdz) / (spd * Math.max(0.001, pDist));
          if (align > 0.58) {
            includePt(pocket.x, pocket.z);
          }
        }
      }
    }
  }

  for (let i = 0; i < ctx.recentPockets.length; i++) {
    const ev = ctx.recentPockets[i]!;
    if (ctx.nowMs - ev.atMs <= 1150) {
      includePt(ev.x, ev.z);
    }
  }

  if (count === 0 || !Number.isFinite(minX)) {
    return buildFullTableOblique(isPortrait ? 56 : 52, true);
  }

  const padX = 0.28;
  const padZ = 0.24;
  const boxMinX = Math.max(-HALF_W_3D - 0.12, minX - padX);
  const boxMaxX = Math.min(HALF_W_3D + 0.12, maxX + padX);
  const boxMinZ = Math.max(-HALF_H_3D - 0.12, minZ - padZ);
  const boxMaxZ = Math.min(HALF_H_3D + 0.12, maxZ + padZ);

  const spanX = Math.max(0.76, boxMaxX - boxMinX);
  const spanZ = Math.max(0.46, boxMaxZ - boxMinZ);
  const spreadFrac = Math.max(
    0,
    Math.min(1, Math.max((spanX - 0.76) / 1.85, (spanZ - 0.46) / 0.95)),
  );

  const baseElevDeg = isPortrait ? 44 : 42;
  const wideElevDeg = isPortrait ? 59 : 55;
  const elevationRad = (baseElevDeg + (wideElevDeg - baseElevDeg) * spreadFrac) * DEG_TO_RAD;

  const fullTable = spreadFrac >= 0.85;
  const azimuthRad = computeObliqueShotAzimuth3D(aimAngle, safeAspect, fullTable);

  const maxOffsetX = HALF_W_3D * 0.72;
  const maxOffsetZ = HALF_H_3D * 0.66;
  const rawCx = Math.max(-maxOffsetX, Math.min(maxOffsetX, (boxMinX + boxMaxX) * 0.5));
  const rawCz = Math.max(-maxOffsetZ, Math.min(maxOffsetZ, (boxMinZ + boxMaxZ) * 0.5));
  const centerWeight = fullTable ? 0 : Math.max(0, 1 - spreadFrac * 0.65);
  const cx = rawCx * centerWeight;
  const cz = rawCz * centerWeight;

  const targetDistance = fitBoxInObliqueFrustum3D({
    minX: Math.min(boxMinX, cx - spanX * 0.5),
    maxX: Math.max(boxMaxX, cx + spanX * 0.5),
    minZ: Math.min(boxMinZ, cz - spanZ * 0.5),
    maxZ: Math.max(boxMaxZ, cz + spanZ * 0.5),
    cx,
    cz,
    elevationRad,
    azimuthRad,
    fovDeg: fov,
    aspect: safeAspect,
    safeFracX: isPortrait ? 0.84 : 0.86,
    safeFracY: isPortrait ? 0.78 : 0.78,
  });

  return {
    cx,
    cz,
    minX: boxMinX,
    maxX: boxMaxX,
    minZ: boxMinZ,
    maxZ: boxMaxZ,
    spanX,
    spanZ,
    targetDistance,
    targetElevationRad: elevationRad,
    targetAzimuthRad: azimuthRad,
    targetHeight: 0.02 + targetDistance * Math.sin(elevationRad),
    fullTable,
    valid: true,
  };
}

/**
 * Applies asymmetric damping (widens distance & elevation rapidly to protect visibility,
 * tightens gently with deadband hysteresis to prevent zoom pumping) and returns a true
 * elevated oblique 3D sports-broadcast camera pose (`up = [0, 1, 0]`).
 */
export function stepAdaptiveShotCamera(
  smoother: AdaptiveSmootherState,
  region: AdaptiveFramingRegion,
  aspect: number,
  dt: number,
  nowMs: number,
): ComputedCameraPose {
  const safeAspect = Math.max(0.4, aspect || 1);
  const fov = safeAspect < 0.85 ? 55 : 44;

  if (!smoother.initialized) {
    smoother.initialized = true;
    smoother.cx = region.cx;
    smoother.cz = region.cz;
    smoother.distance = region.targetDistance;
    smoother.elevationRad = region.targetElevationRad;
    smoother.azimuthRad = region.targetAzimuthRad;
    smoother.height = 0.02 + smoother.distance * Math.sin(smoother.elevationRad);
    smoother.holdWideUntilMs = nowMs + 260;
  } else {
    const distDiff = region.targetDistance - smoother.distance;
    const elevDiff = region.targetElevationRad - smoother.elevationRad;

    if (distDiff > 0.03) {
      smoother.distance += distDiff * smoothFactor(9.5, dt);
      if (distDiff > 0.08) {
        smoother.holdWideUntilMs = Math.max(smoother.holdWideUntilMs, nowMs + 480);
      }
    } else if (distDiff < -0.11 && nowMs >= smoother.holdWideUntilMs) {
      smoother.distance += distDiff * smoothFactor(2.0, dt);
    }

    if (elevDiff > 0.008) {
      smoother.elevationRad += elevDiff * smoothFactor(8.0, dt);
    } else if (elevDiff < -0.02 && nowMs >= smoother.holdWideUntilMs) {
      smoother.elevationRad += elevDiff * smoothFactor(2.2, dt);
    }
    smoother.elevationRad = Math.max(
      35 * DEG_TO_RAD,
      Math.min(68 * DEG_TO_RAD, smoother.elevationRad),
    );

    const azDiff = shortestAngleDelta3D(smoother.azimuthRad, region.targetAzimuthRad);
    smoother.azimuthRad += azDiff * smoothFactor(2.8, dt);

    const posRate = distDiff > 0.03 ? 7.5 : 5.0;
    const posAlpha = smoothFactor(posRate, dt);
    const dx = region.cx - smoother.cx;
    const dz = region.cz - smoother.cz;
    if (Math.abs(dx) > 0.006) smoother.cx += dx * posAlpha;
    if (Math.abs(dz) > 0.006) smoother.cz += dz * posAlpha;
    smoother.height = 0.02 + smoother.distance * Math.sin(smoother.elevationRad);
  }

  return composeObliquePose(
    smoother.cx,
    smoother.cz,
    smoother.distance,
    smoother.elevationRad,
    smoother.azimuthRad,
    fov,
  );
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

  // Automatic shot camera & post-shot overview (when not overridden manually):
  // - Adaptive Cinematic: ALWAYS uses elevated OBLIQUE 3D overview (`52°–56°`), NEVER 90° vertical top-down.
  // - Tactical Overview: uses vertical overhead 90° top-down view (`computeTacticalOverviewPose3D`).
  if (
    !input.draggingCueBall &&
    !input.hoverZoomActive &&
    (input.cameraStage === 'shot_transition' ||
      input.cameraStage === 'tracking' ||
      input.cameraStage === 'overview')
  ) {
    if (input.shotCameraMode === 'adaptive') {
      const aimAngle = input.adaptiveContext?.shotAimAngle ?? input.visualAimAngle;
      return computeObliqueOverviewPose3D(safeAspect, aimAngle);
    }
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
  private adaptiveSmoother: AdaptiveSmootherState = createAdaptiveSmootherState();
  private lastShotStage: Billiards3DCameraStage = 'aiming';
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

    const enteringAutoShot =
      (rawInput.cameraStage === 'shot_transition' || rawInput.cameraStage === 'tracking') &&
      this.lastShotStage !== 'shot_transition' &&
      this.lastShotStage !== 'tracking';
    if (enteringAutoShot) {
      // Seed oblique adaptive smoother cleanly from current 3D camera offset & shot azimuth
      const dx = this.camera.position.x - this.targetLook.x;
      const dy = Math.max(0.25, this.camera.position.y - 0.02);
      const dz = this.camera.position.z - this.targetLook.z;
      const curDist = Math.max(1.5, Math.hypot(dx, dy, dz));
      const curElev = Math.max(
        35 * DEG_TO_RAD,
        Math.min(64 * DEG_TO_RAD, Math.atan2(dy, Math.max(0.2, Math.hypot(dx, dz)))),
      );
      const targetAz = computeObliqueShotAzimuth3D(
        rawInput.adaptiveContext?.shotAimAngle ?? this.visualAimAngle,
        rawInput.aspect || 1,
        Boolean(rawInput.adaptiveContext?.isBreakShot),
      );
      this.adaptiveSmoother.initialized = true;
      this.adaptiveSmoother.cx = this.targetLook.x;
      this.adaptiveSmoother.cz = this.targetLook.z;
      this.adaptiveSmoother.distance = curDist;
      this.adaptiveSmoother.elevationRad = curElev;
      this.adaptiveSmoother.azimuthRad = targetAz;
      this.adaptiveSmoother.height = 0.02 + curDist * Math.sin(curElev);
      this.adaptiveSmoother.holdWideUntilMs =
        (rawInput.adaptiveContext?.nowMs ?? 0) + 220;
    }
    this.lastShotStage = rawInput.cameraStage ?? 'aiming';

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

    // Strict ownership: OrbitControls is disabled during Follow / Top / Ball-in-Hand / Auto Shot
    this.controls.enabled = false;

    const useAdaptiveTracking =
      rawInput.shotCameraMode === 'adaptive' &&
      !rawInput.draggingCueBall &&
      !rawInput.hoverZoomActive &&
      (rawInput.cameraStage === 'shot_transition' || rawInput.cameraStage === 'tracking');

    const pose = useAdaptiveTracking
      ? stepAdaptiveShotCamera(
          this.adaptiveSmoother,
          computeAdaptiveFramingRegion3D(
            rawInput.balls,
            rawInput.adaptiveContext,
            rawInput.aspect || 1,
          ),
          rawInput.aspect || 1,
          dt,
          rawInput.adaptiveContext?.nowMs ?? 0,
        )
      : computeCameraPose3D({
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
      useAdaptiveTracking
        ? 8.5
        : rawInput.shotCameraMode === 'adaptive' && rawInput.cameraStage === 'overview'
          ? 5.5
          : effectiveMode === 'top' || automaticStageOverride
            ? 8.5
            : 10,
      dt,
    );
    this.camera.position.lerp(this.targetPos, alpha);
    this.camera.quaternion.slerp(this.targetQuat, alpha);
  }

  dispose(): void {
    this.controls.dispose();
  }
}
