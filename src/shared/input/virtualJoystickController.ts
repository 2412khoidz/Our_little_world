/**
 * Pure TypeScript virtual joystick controller.
 * Adapted selectively from dolan/floating-thumb-dungeon (independent pointer ID,
 * origin-at-touch geometry) and nipplejs (radial deadzone normalization).
 * Excludes unsafe touchcancel conflation and document-wide scroll blocking.
 */

export interface JoystickVector {
  readonly vx: number;
  readonly vy: number;
}

export interface JoystickConfig {
  readonly maxRadiusPx: number;
  readonly deadzoneRatio: number;
}

export const DEFAULT_JOYSTICK_CONFIG: JoystickConfig = {
  maxRadiusPx: 38,
  deadzoneRatio: 0.14,
};

export interface JoystickControllerState {
  readonly active: boolean;
  readonly activePointerId: number | null;
  readonly originX: number;
  readonly originY: number;
  readonly knobX: number;
  readonly knobY: number;
  readonly vx: number;
  readonly vy: number;
}

export function createJoystickState(): JoystickControllerState {
  return {
    active: false,
    activePointerId: null,
    originX: 0,
    originY: 0,
    knobX: 0,
    knobY: 0,
    vx: 0,
    vy: 0,
  };
}

function computeDisplacement(
  originX: number,
  originY: number,
  clientX: number,
  clientY: number,
  config: JoystickConfig,
): { knobX: number; knobY: number; vx: number; vy: number } {
  const maxR = Math.max(8, config.maxRadiusPx);
  const deadzone = Math.max(0, Math.min(0.6, config.deadzoneRatio));
  const dx = clientX - originX;
  const dy = clientY - originY;
  const dist = Math.hypot(dx, dy);

  if (!Number.isFinite(dist) || dist <= 0.0001) {
    return { knobX: 0, knobY: 0, vx: 0, vy: 0 };
  }

  const clampedDist = Math.min(dist, maxR);
  const ux = dx / dist;
  const uy = dy / dist;
  const knobX = ux * clampedDist;
  const knobY = uy * clampedDist;

  const normalizedMag = clampedDist / maxR;
  if (normalizedMag <= deadzone) {
    return { knobX, knobY, vx: 0, vy: 0 };
  }

  const rescaled = Math.min(1, (normalizedMag - deadzone) / (1 - deadzone));
  return {
    knobX,
    knobY,
    vx: ux * rescaled,
    vy: uy * rescaled,
  };
}

export function joystickPointerDown(
  state: JoystickControllerState,
  pointerId: number,
  originX: number,
  originY: number,
  clientX: number,
  clientY: number,
  config: JoystickConfig = DEFAULT_JOYSTICK_CONFIG,
): JoystickControllerState {
  // Ignore secondary touches while one thumb owns the joystick.
  if (state.activePointerId !== null && state.activePointerId !== pointerId) {
    return state;
  }
  const { knobX, knobY, vx, vy } = computeDisplacement(
    originX,
    originY,
    clientX,
    clientY,
    config,
  );
  return {
    active: true,
    activePointerId: pointerId,
    originX,
    originY,
    knobX,
    knobY,
    vx,
    vy,
  };
}

export function joystickPointerMove(
  state: JoystickControllerState,
  pointerId: number,
  clientX: number,
  clientY: number,
  config: JoystickConfig = DEFAULT_JOYSTICK_CONFIG,
): JoystickControllerState {
  if (!state.active || state.activePointerId !== pointerId) {
    return state;
  }
  const { knobX, knobY, vx, vy } = computeDisplacement(
    state.originX,
    state.originY,
    clientX,
    clientY,
    config,
  );
  return {
    ...state,
    knobX,
    knobY,
    vx,
    vy,
  };
}

export function joystickPointerRelease(
  state: JoystickControllerState,
  pointerId: number,
): JoystickControllerState {
  if (state.activePointerId !== pointerId) {
    return state;
  }
  return createJoystickState();
}

export function joystickCancelAll(
  state: JoystickControllerState,
): JoystickControllerState {
  if (!state.active && state.activePointerId === null && state.vx === 0 && state.vy === 0) {
    return state;
  }
  return createJoystickState();
}
