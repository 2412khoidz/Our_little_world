import { useEffect, useState } from 'react';
import { gameEventBus } from '../../game/eventBus';

interface PetCareTouchOverlayProps {
  active: boolean;
  onExit: () => void;
}

/** Cozy care chrome — minimal copy, Nintendogs-like focal layout. */
export function PetCareTouchOverlay({ active, onExit }: PetCareTouchOverlayProps) {
  const [hint, setHint] = useState('');
  const [goalsLabel, setGoalsLabel] = useState('');

  useEffect(() => {
    if (!active) return;
    return gameEventBus.on('evt:pet-care-session-goals', ({ count, total }) => {
      setGoalsLabel(count > 0 ? `${count}/${total}` : '');
    });
  }, [active]);

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

  const withHint = (msg: string, action: () => void) => () => {
    action();
    setHint(msg);
    window.setTimeout(() => setHint(''), 2200);
  };

  if (!active) return null;

  return (
    <div
      className="pet-care-overlay"
      data-testid="pet-care-overlay"
      aria-label="Chế độ chăm sóc mèo"
    >
      <div className="pet-care-overlay__vignette" />
      <p className="pet-care-overlay__title">
        Chăm sóc bé
        {goalsLabel ? ` · ${goalsLabel}` : ''}
      </p>
      {hint ? (
        <p className="pet-care-overlay__hint" data-testid="pet-care-stroke-hint">
          {hint}
        </p>
      ) : (
        <p className="pet-care-overlay__hint pet-care-overlay__hint--ghost" data-testid="pet-care-stroke-hint">
          Vuốt lên mèo · thanh đồ + J
        </p>
      )}
      <div className="pet-care-overlay__actions">
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-call"
          onClick={withHint('Gọi tên…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'call' }))}
        >
          Gọi
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-observe"
          onClick={withHint('Quan sát…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'observe' }))}
        >
          Quan sát
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-brush"
          onClick={withHint('Chải lông…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'brush' }))}
        >
          Chải
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-water"
          onClick={withHint('Rót nước…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'pour_water' }))}
        >
          Nước
        </button>
      </div>
      <button type="button" className="pet-care-overlay__exit" data-testid="pet-care-exit" onClick={onExit}>
        Thoát
      </button>
    </div>
  );
}