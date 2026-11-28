import { useEffect, useRef } from 'react';

/** Standard Gamepad API button mappings. Actions share the keyboard/touch dispatch gate. */
const buttons = { primary: 0, back: 1, secondary: 2, inventory: 3, previousRow: 4, nextRow: 5 } as const;
type WorldGamepadActions = Record<keyof typeof buttons, () => void>;

export function useWorldGamepad(enabled: boolean, actions: WorldGamepadActions): void {
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  useEffect(() => {
    if (!enabled || typeof navigator.getGamepads !== 'function') return;
    const read = () => Array.from(navigator.getGamepads()).find((pad) => pad?.mapping === 'standard');
    let frame: number | null = null;
    let previous = new Set<number>();

    const poll = () => {
      const pad = read();
      if (!pad) {
        frame = null;
        previous.clear();
        return;
      }
      const pressed = new Set<number>();
      for (const action of Object.keys(buttons) as (keyof typeof buttons)[]) {
        const index = buttons[action];
        if (!pad.buttons[index]?.pressed) continue;
        pressed.add(index);
        if (!previous.has(index) && document.visibilityState === 'visible') actionsRef.current[action]();
      }
      previous = pressed;
      frame = requestAnimationFrame(poll);
    };
    const start = () => {
      if (frame !== null) return;
      const pad = read();
      if (!pad) return;
      previous = new Set(Object.values(buttons).filter((index) => pad.buttons[index]?.pressed));
      frame = requestAnimationFrame(poll);
    };
    window.addEventListener('gamepadconnected', start);
    start();
    return () => {
      window.removeEventListener('gamepadconnected', start);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [enabled]);
}
