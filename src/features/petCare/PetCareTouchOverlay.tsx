import { useCallback, useEffect, useRef, useState } from 'react';
import { gameEventBus } from '../../game/eventBus';

interface PetCareTouchOverlayProps {
  active: boolean;
  onExit: () => void;
}

/** Full-screen care gestures — strokes map to pet reactions (presentation, Mission 04C). */
export function PetCareTouchOverlay({ active, onExit }: PetCareTouchOverlayProps) {
  const [hint, setHint] = useState<string | null>(null);
  const strokeCount = useRef(0);

  const emitStroke = useCallback((zone: 'head' | 'back' | 'chin') => {
    strokeCount.current += 1;
    gameEventBus.emit('cmd:pet-care-stroke', { zone, strokeIndex: strokeCount.current });
    const vi =
      zone === 'head' ? 'Purrr~' : zone === 'chin' ? 'Chính…' : 'Thích lắm!';
    setHint(vi);
    window.setTimeout(() => setHint((h) => (h === vi ? null : h)), 1200);
  }, []);

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

  if (!active) return null;

  return (
    <div
      className="pet-care-overlay"
      data-testid="pet-care-overlay"
      aria-label="Chế độ chăm sóc mèo cận cảnh"
    >
      <div className="pet-care-overlay__vignette" />
      <p className="pet-care-overlay__title">Chăm sóc gần — vuốt lên vùng mèo</p>
      {hint && (
        <p className="pet-care-overlay__hint" data-testid="pet-care-stroke-hint">
          {hint}
        </p>
      )}
      <button type="button" className="pet-care-overlay__exit" data-testid="pet-care-exit" onClick={onExit}>
        Thoát (ESC)
      </button>
      <div className="pet-care-zones">
        <button
          type="button"
          className="pet-care-zone pet-care-zone--head"
          aria-label="Vuốt đầu"
          onPointerDown={() => emitStroke('head')}
        />
        <button
          type="button"
          className="pet-care-zone pet-care-zone--chin"
          aria-label="Gãi cằm"
          onPointerDown={() => emitStroke('chin')}
        />
        <button
          type="button"
          className="pet-care-zone pet-care-zone--back"
          aria-label="Vuốt lưng"
          onPointerDown={() => emitStroke('back')}
        />
      </div>
    </div>
  );
}