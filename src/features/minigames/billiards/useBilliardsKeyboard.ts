import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { billiardsSound } from './sound';

export interface BilliardsKeyboardControlsOptions {
  active: boolean;
  canShootNow: () => boolean;
  canAimNow: () => boolean;
  hasInnerModalOpen: () => boolean;
  onCloseInnerModal: () => void;
  getAimAngle: () => number;
  setAimAngle: (angle: number) => void;
  getPower: () => number;
  setPower: (power: number) => void;
  onPowerUiSync: (power: number) => void;
  onAimPreviewSync?: (angle: number, power: number) => void;
  onFireShot: () => void;
  onHoverZoomChange: (active: boolean) => void;
}

const OVERWORLD_BLOCKED_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyE',
  'KeyJ',
  'KeyK',
  'KeyC',
  'KeyZ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type?.toLowerCase() || 'text';
    return type !== 'range' && type !== 'button' && type !== 'checkbox' && type !== 'radio';
  }
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/**
 * Restores desktop billiards keyboard controls from the original edition:
 * - Hold Space: oscillating shot power bar (0.06 <-> 1.0 @ 1.25/s), release Space to shoot
 * - ArrowLeft / ArrowRight (+ Shift for fine precision): rotate cue aim
 * - Hold Z: magnifier hover zoom
 * - Escape: cancel active Space charge or close inner popup first
 * Also prevents overworld movement keys (WASD / Arrows / Space / E / J / K / 1-8) from leaking.
 */
export function useBilliardsKeyboard(opts: BilliardsKeyboardControlsOptions) {
  const optsRef = useRef(opts);
  useLayoutEffect(() => {
    optsRef.current = opts;
  });

  const keyStateRef = useRef({
    left: false,
    right: false,
    shift: false,
    spaceCharging: false,
    spaceDir: 1 as 1 | -1,
    hoverZoom: false,
  });

  const resetKeys = useCallback(() => {
    const ks = keyStateRef.current;
    ks.left = false;
    ks.right = false;
    ks.shift = false;
    if (ks.spaceCharging) {
      ks.spaceCharging = false;
      optsRef.current.setPower(0);
      optsRef.current.onPowerUiSync(0);
    }
    if (ks.hoverZoom) {
      ks.hoverZoom = false;
      optsRef.current.onHoverZoomChange(false);
    }
  }, []);

  useEffect(() => {
    if (!opts.active) {
      resetKeys();
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const o = optsRef.current;
      const ks = keyStateRef.current;

      if (OVERWORLD_BLOCKED_CODES.has(e.code)) {
        e.stopImmediatePropagation();
      }

      if (e.key === 'Shift') ks.shift = true;

      if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        e.preventDefault();
        ks.left = true;
        return;
      }
      if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        e.preventDefault();
        ks.right = true;
        return;
      }
      if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') {
        if (!ks.hoverZoom) {
          ks.hoverZoom = true;
          o.onHoverZoomChange(true);
        }
        return;
      }
      if (e.key === 'Escape') {
        if (ks.spaceCharging) {
          e.preventDefault();
          e.stopImmediatePropagation();
          ks.spaceCharging = false;
          o.setPower(0);
          o.onPowerUiSync(0);
          o.onAimPreviewSync?.(o.getAimAngle(), 0);
          return;
        }
        if (o.hasInnerModalOpen()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          o.onCloseInnerModal();
        }
        return;
      }

      if (e.code === 'Space') {
        // Prevent Space from activating a focused button or scrolling
        e.preventDefault();
        if (e.repeat) return;
        if (!o.canShootNow() || ks.spaceCharging) return;
        billiardsSound.unlock();
        ks.spaceCharging = true;
        ks.spaceDir = 1;
        o.setPower(0.08);
        o.onPowerUiSync(0.08);
        o.onAimPreviewSync?.(o.getAimAngle(), 0.08);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const o = optsRef.current;
      const ks = keyStateRef.current;

      if (OVERWORLD_BLOCKED_CODES.has(e.code)) {
        e.stopImmediatePropagation();
      }

      if (e.key === 'Shift') ks.shift = false;

      if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        ks.left = false;
        return;
      }
      if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        ks.right = false;
        return;
      }
      if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') {
        if (ks.hoverZoom) {
          ks.hoverZoom = false;
          o.onHoverZoomChange(false);
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!ks.spaceCharging) return;
        ks.spaceCharging = false;
        if (o.canShootNow() && o.getPower() >= 0.04) {
          o.onFireShot();
        } else {
          o.setPower(0);
          o.onPowerUiSync(0);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', resetKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', resetKeys);
      resetKeys();
    };
  }, [opts.active, resetKeys]);

  const stepKeyboardControls = useCallback((dt: number) => {
    const o = optsRef.current;
    const ks = keyStateRef.current;
    if (!o.active) return;

    let aimChanged = false;
    let powerChanged = false;

    if ((ks.left || ks.right) && o.canAimNow()) {
      const speed = ks.shift ? 0.18 : 0.72;
      const rot = speed * dt;
      let nextAngle = o.getAimAngle();
      if (ks.left) nextAngle -= rot;
      if (ks.right) nextAngle += rot;
      o.setAimAngle(nextAngle);
      aimChanged = true;
    }

    if (ks.spaceCharging) {
      if (!o.canShootNow()) {
        ks.spaceCharging = false;
        o.setPower(0);
        o.onPowerUiSync(0);
        return;
      }
      let nextPower = o.getPower() + 1.25 * dt * ks.spaceDir;
      if (nextPower >= 1) {
        nextPower = 1;
        ks.spaceDir = -1;
      } else if (nextPower <= 0.06) {
        nextPower = 0.06;
        ks.spaceDir = 1;
      }
      o.setPower(nextPower);
      o.onPowerUiSync(nextPower);
      powerChanged = true;
    }

    if (aimChanged || powerChanged) {
      o.onAimPreviewSync?.(o.getAimAngle(), o.getPower());
    }
  }, []);

  return {
    stepKeyboardControls,
    isSpaceCharging: () => keyStateRef.current.spaceCharging,
  };
}
