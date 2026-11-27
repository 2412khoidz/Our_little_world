import { useCallback, useEffect, useRef, useState } from 'react';
import { gameEventBus } from '../../../game/eventBus';
import {
  createJoystickState,
  DEFAULT_JOYSTICK_CONFIG,
  joystickCancelAll,
  joystickPointerDown,
  joystickPointerMove,
  joystickPointerRelease,
  type JoystickControllerState,
} from '../../../shared/input/virtualJoystickController';
import type { HudLayoutMode, JoystickMode } from '../../../shared/viewport/viewportPolicy';

interface TouchJoystickProps {
  visible: boolean;
  disabled: boolean;
  mode: JoystickMode;
  layoutMode: HudLayoutMode;
}

export function TouchJoystick({
  visible,
  disabled,
  mode,
  layoutMode,
}: TouchJoystickProps) {
  const [joyState, setJoyState] = useState<JoystickControllerState>(() => createJoystickState());
  const [floatingLocalPos, setFloatingLocalPos] = useState<{ left: number; top: number }>({
    left: 44,
    top: 44,
  });
  const stateRef = useRef<JoystickControllerState>(joyState);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  const emitIfChanged = useCallback((next: JoystickControllerState) => {
    const vx = Math.round(next.vx * 1000) / 1000;
    const vy = Math.round(next.vy * 1000) / 1000;
    if (lastEmittedRef.current.vx !== vx || lastEmittedRef.current.vy !== vy) {
      lastEmittedRef.current = { vx, vy };
      gameEventBus.emit('cmd:set-joystick', { vx, vy });
    }
  }, []);

  const commitState = useCallback(
    (next: JoystickControllerState) => {
      stateRef.current = next;
      setJoyState(next);
      emitIfChanged(next);
    },
    [emitIfChanged],
  );

  const resetAll = useCallback(() => {
    const next = joystickCancelAll(stateRef.current);
    if (next !== stateRef.current || lastEmittedRef.current.vx !== 0 || lastEmittedRef.current.vy !== 0) {
      commitState(next);
    }
  }, [commitState]);

  useEffect(() => {
    if (!visible || disabled) {
      resetAll();
    }
  }, [visible, disabled, resetAll]);

  // Guaranteed cleanup on blur, tab hide, orientation change, and unmount so the character never gets stuck walking.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) resetAll();
    };
    const onResetEvent = () => resetAll();

    window.addEventListener('blur', onResetEvent);
    window.addEventListener('pagehide', onResetEvent);
    window.addEventListener('orientationchange', onResetEvent);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('blur', onResetEvent);
      window.removeEventListener('pagehide', onResetEvent);
      window.removeEventListener('orientationchange', onResetEvent);
      document.removeEventListener('visibilitychange', onVisibility);
      resetAll();
    };
  }, [resetAll]);

  if (!visible || disabled) return null;

  const isFloating = mode === 'floating' && layoutMode !== 'desktop';
  const maxRadiusPx = layoutMode === 'mobile-landscape' ? 32 : 34;
  const config = {
    maxRadiusPx,
    deadzoneRatio: DEFAULT_JOYSTICK_CONFIG.deadzoneRatio,
  };

  return (
    <div
      ref={zoneRef}
      className={`olw-touch-joystick ${isFloating ? 'olw-touch-joystick--floating' : 'olw-touch-joystick--fixed'} ${joyState.active ? 'is-active' : ''}`}
      data-testid="touch-joystick"
      data-joy-mode={mode}
      data-joy-active={joyState.active ? '1' : '0'}
      data-joy-vx={String(Math.round(joyState.vx * 100) / 100)}
      data-joy-vy={String(Math.round(joyState.vy * 100) / 100)}
      role="application"
      aria-label="Cần điều khiển di chuyển"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (stateRef.current.activePointerId !== null) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const originX = isFloating ? e.clientX : rect.left + rect.width / 2;
        const originY = isFloating ? e.clientY : rect.top + rect.height / 2;
        if (isFloating) {
          setFloatingLocalPos({
            left: e.clientX - rect.left,
            top: e.clientY - rect.top,
          });
        }
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointer events in tests may omit active pointer capture
        }
        const next = joystickPointerDown(
          stateRef.current,
          e.pointerId,
          originX,
          originY,
          e.clientX,
          e.clientY,
          config,
        );
        commitState(next);
      }}
      onPointerMove={(e) => {
        if (stateRef.current.activePointerId !== e.pointerId) return;
        e.preventDefault();
        e.stopPropagation();
        const next = joystickPointerMove(
          stateRef.current,
          e.pointerId,
          e.clientX,
          e.clientY,
          config,
        );
        commitState(next);
      }}
      onPointerUp={(e) => {
        if (stateRef.current.activePointerId !== e.pointerId) return;
        e.stopPropagation();
        try {
          if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
        commitState(joystickPointerRelease(stateRef.current, e.pointerId));
      }}
      onPointerCancel={(e) => {
        if (stateRef.current.activePointerId !== e.pointerId) return;
        e.stopPropagation();
        commitState(joystickPointerRelease(stateRef.current, e.pointerId));
      }}
      onLostPointerCapture={() => {
        resetAll();
      }}
    >
      {isFloating ? (
        joyState.active ? (
          <div
            className="olw-touch-joystick__ring olw-touch-joystick__ring--floating"
            style={{
              left: floatingLocalPos.left,
              top: floatingLocalPos.top,
            }}
          >
            <div
              className="olw-touch-joystick__knob"
              style={{
                transform: `translate(${joyState.knobX}px, ${joyState.knobY}px)`,
              }}
            />
          </div>
        ) : (
          <div className="olw-touch-joystick__floating-hint">
            <div className="olw-touch-joystick__ring olw-touch-joystick__ring--ghost">
              <div className="olw-touch-joystick__knob" />
            </div>
          </div>
        )
      ) : (
        <div className="olw-touch-joystick__ring">
          <div
            className="olw-touch-joystick__knob"
            style={{
              transform: `translate(${joyState.knobX}px, ${joyState.knobY}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
