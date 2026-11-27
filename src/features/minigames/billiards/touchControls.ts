export const TOUCH_TAP_DEADZONE_PX = 6;
export const TOUCH_CUE_BALL_LIFT_PX = 36;
export const POWER_CANCEL_SLIDE_X_PX = 54;
export const POWER_MIN_RATIO = 0.06;

/**
 * Computes responsive angular delta from a touch drag increment `(dx, dy)`.
 * Slow careful drags produce fine precision adjustment (like 8 Ball Pool micro-aim),
 * while wider sweeps rotate faster. Tangential drag around the cue ball matches natural winding.
 */
export function computeAdaptiveAimDelta(params: {
  dx: number;
  dy: number;
  cueClientX: number;
  cueClientY: number;
  pointerClientX: number;
  pointerClientY: number;
  precisionMode: boolean;
  flippedHandedness?: boolean;
}): number {
  const { dx, dy, cueClientX, cueClientY, pointerClientX, pointerClientY, precisionMode } = params;
  const moveDist = Math.hypot(dx, dy);
  if (moveDist < 0.05) return 0;

  // Non-linear speed curve: slow drags (< 3px) -> micro precision, larger drags -> smooth sweep
  const speedScale =
    moveDist < 2.5 ? 0.28 : moveDist < 7 ? 0.52 : Math.min(1.22, 0.72 + moveDist * 0.025);
  const precisionMul = precisionMode ? 0.35 : 1.0;

  const rx = pointerClientX - cueClientX;
  const ry = pointerClientY - cueClientY;
  const radius = Math.hypot(rx, ry);

  let rawDelta: number;
  if (radius >= 28) {
    // 2D cross product / r^2 gives natural angular delta around the cue ball
    const angularDelta = (rx * dy - ry * dx) / (radius * radius);
    rawDelta = angularDelta * (params.flippedHandedness ? -1 : 1) * 1.15;
  } else {
    rawDelta = -dx * 0.0055;
  }

  return rawDelta * speedScale * precisionMul;
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
