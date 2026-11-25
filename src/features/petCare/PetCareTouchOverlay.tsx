import { useEffect, useState } from 'react';
import { gameEventBus } from '../../game/eventBus';

interface PetCareTouchOverlayProps {
  active: boolean;
  onExit: () => void;
}

/** Thin HUD — strokes happen on the Phaser close-up rig; hotbar + J for toys/food. */
export function PetCareTouchOverlay({ active, onExit }: PetCareTouchOverlayProps) {
  const [hint, setHint] = useState('Vuốt trên thân mèo — đầu, cằm, lưng');

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onExit]);

  const callPet = () => {
    gameEventBus.emit('cmd:pet-care-action', { kind: 'call' });
    setHint('Gọi tên bé…');
  };

  const observe = () => {
    gameEventBus.emit('cmd:pet-care-action', { kind: 'observe' });
    setHint('Quan sát — để bé tự làm việc của mình');
  };

  if (!active) return null;

  return (
    <div
      className="pet-care-overlay"
      data-testid="pet-care-overlay"
      aria-label="Chế độ chăm sóc mèo cận cảnh"
    >
      <div className="pet-care-overlay__vignette" />
      <p className="pet-care-overlay__title">Chăm sóc gần — vuốt lên mèo, dùng thanh đồ (1–8) + J</p>
      <p className="pet-care-overlay__hint" data-testid="pet-care-stroke-hint">
        {hint}
      </p>
      <div className="pet-care-overlay__actions">
        <button type="button" className="pet-care-overlay__chip" data-testid="pet-care-call" onClick={callPet}>
          Gọi mèo
        </button>
        <button type="button" className="pet-care-overlay__chip" data-testid="pet-care-observe" onClick={observe}>
          Quan sát
        </button>
        <button type="button" className="pet-care-overlay__exit" data-testid="pet-care-exit" onClick={onExit}>
          Thoát (ESC)
        </button>
      </div>
    </div>
  );
}