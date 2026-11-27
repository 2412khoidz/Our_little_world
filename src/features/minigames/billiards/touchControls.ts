import { clientToPhysics2D, physicsToClient2D } from './viewportTransform';

export const MIN_DIRECT_AIM_SCREEN_PX = 14;
export const TOUCH_TAP_SLOP_PX = 8;
export const TOUCH_TAP_MAX_MS = 450;
export const TOUCH_CUE_BALL_LIFT_PX = 36;
export const POWER_CANCEL_SLIDE_X_PX = 54;
export const POWER_MIN_RATIO = 0.06;

export interface TapGestureState {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  maxDistPx: number;
  downTimeMs: number;
  cancelled: boolean;
  multiTouch: boolean;
  blockedByUi: boolean;
  isBallInHandDrag: boolean;
}

export function beginTapGesture(params: {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  timeMs: number;
  blockedByUi?: boolean;
  isBallInHandDrag?: boolean;
}): TapGestureState {
  return {
    pointerId: params.pointerId,
    pointerType: params.pointerType || 'mouse',
    startX: params.clientX,
    startY: params.clientY,
    maxDistPx: 0,
    downTimeMs: params.timeMs,
    cancelled: false,
    multiTouch: false,
    blockedByUi: Boolean(params.blockedByUi),
    isBallInHandDrag: Boolean(params.isBallInHandDrag),
  };
}

export function updateTapGesture(
  state: TapGestureState | null,
  pointerId: number,
  clientX: number,
  clientY: number,
): TapGestureState | null {
  if (!state || state.pointerId !== pointerId) return state;
  const dist = Math.hypot(clientX - state.startX, clientY - state.startY);
  if (dist > state.maxDistPx) {
    state.maxDistPx = dist;
  }
  return state;
}

export function markTapMultiTouch(state: TapGestureState | null): void {
  if (state) {
    state.multiTouch = true;
  }
}

export function cancelTapGesture(state: TapGestureState | null): void {
  if (state) {
    state.cancelled = true;
  }
}

/**
 * Classifies whether a completed pointer gesture qualifies as a genuine tap:
 * - Single-touch/pointer, never transitioned into multitouch
 * - Never cancelled or started on UI/ball-in-hand drag
 * - Peak CSS-pixel displacement from start never exceeded `maxSlopPx` (default 8 CSS px)
 * - Gesture duration stayed within `maxDurationMs` (default 450 ms)
 */
export function completeTapGesture(
  state: TapGestureState | null,
  params: {
    pointerId: number;
    clientX: number;
    clientY: number;
    timeMs: number;
    maxSlopPx?: number;
    maxDurationMs?: number;
  },
): boolean {
  if (!state || state.pointerId !== params.pointerId) return false;
  if (state.cancelled || state.multiTouch || state.blockedByUi || state.isBallInHandDrag) {
    return false;
  }
  const maxSlop = params.maxSlopPx ?? TOUCH_TAP_SLOP_PX;
  const maxDur = params.maxDurationMs ?? TOUCH_TAP_MAX_MS;
  const endDist = Math.hypot(params.clientX - state.startX, params.clientY - state.startY);
  const peakDist = Math.max(state.maxDistPx, endDist);
  if (!Number.isFinite(peakDist) || peakDist > maxSlop) return false;
  const dur = params.timeMs - state.downTimeMs;
  return dur >= 0 && dur <= maxDur;
}

/**
 * Frame-rate & DPR independent pinch zoom multiplier where `sensitivityMul = 1.0`
 * (100%) equals the exact baseline `currentZoom * ratio`.
 */
export function applyPinchZoomSensitivity(
  currentZoom: number,
  pinchRatio: number,
  sensitivityMul: number,
  minZoom: number,
  maxZoom: number,
): number {
  if (!Number.isFinite(pinchRatio) || pinchRatio <= 0) return currentZoom;
  const safeMul = Math.max(0.05, Math.min(3, sensitivityMul));
  const scaledRatio = Math.pow(pinchRatio, safeMul);
  return Math.max(minZoom, Math.min(maxZoom, currentZoom * scaledRatio));
}

/**
 * Returns the shortest signed angular difference `(toAngle - fromAngle)` wrapped into `(-PI, PI]`.
 */
export function normalizeAngleDelta(fromAngle: number, toAngle: number): number {
  let diff = (toAngle - fromAngle) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff <= -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Direct touch/pointer aiming in 2D physics space (modeled after Mankolik/Pool `aimAt` and
 * vigu-sinuca-arena `updateTouchAimFromPosition`), accounting for portrait -90deg display rotation
 * and zoom via `clientToPhysics2D`.
 *
 * Returns `null` when the pointer is within `MIN_DIRECT_AIM_SCREEN_PX` of the cue ball center on screen
 * to avoid unstable jitter near zero radius.
 */
export function computeDirectAimAngle2D(params: {
  clientX: number;
  clientY: number;
  rect: { left: number; top: number; width: number; height: number };
  cueX: number;
  cueY: number;
  zoomCurrent: number;
  camX: number;
  camY: number;
  portraitRotated: boolean;
}): number | null {
  const cueClient = physicsToClient2D(
    params.cueX,
    params.cueY,
    params.rect,
    params.zoomCurrent,
    params.camX,
    params.camY,
    params.portraitRotated,
  );
  if (
    Math.hypot(params.clientX - cueClient.x, params.clientY - cueClient.y) <
    MIN_DIRECT_AIM_SCREEN_PX
  ) {
    return null;
  }

  const phy = clientToPhysics2D(
    params.clientX,
    params.clientY,
    params.rect,
    params.zoomCurrent,
    params.camX,
    params.camY,
    params.portraitRotated,
  );
  const dx = phy.x - params.cueX;
  const dy = phy.y - params.cueY;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 1e-4) {
    return null;
  }
  return Math.atan2(dy, dx);
}

/**
 * Computes consistent signed fine-aim rotation delta between two direct physics-space angles.
 * Independent of pointer sampling rate, never reverses handedness on portrait rotation,
 * and never switches formulas inside a gesture.
 */
export function computeRelativeFineAimDelta2D(params: {
  prevPhysicsAngle: number;
  curPhysicsAngle: number;
  scale?: number;
}): number {
  const scale = params.scale ?? 0.28;
  return normalizeAngleDelta(params.prevPhysicsAngle, params.curPhysicsAngle) * scale;
}

/**
 * Evaluates a vertical pull along the power cue slot with an intuitive cancel gesture:
 * sliding horizontally past `POWER_CANCEL_SLIDE_X_PX` OR pulling less than `POWER_MIN_RATIO`
 * puts the shot into the cancel zone (`cancelled: true`) so releasing aborts cleanly.
 */
export function evaluatePowerPull(params: {
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  trackHeight: number;
}): { power: number; cancelled: boolean } {
  const span = Math.max(80, params.trackHeight * 0.72);
  const pullY = params.curY - params.startY;
  const ratio = Math.max(0, Math.min(1, pullY / span));
  const horizSlide = Math.abs(params.curX - params.startX);

  if (horizSlide > POWER_CANCEL_SLIDE_X_PX || ratio < POWER_MIN_RATIO) {
    return { power: ratio < POWER_MIN_RATIO ? 0 : ratio, cancelled: true };
  }
  return { power: ratio, cancelled: false };
}
