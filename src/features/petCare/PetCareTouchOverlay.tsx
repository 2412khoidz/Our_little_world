import { useEffect, useRef, useState } from 'react';
import type { CarePlayTool } from '../../game/pet/care/catPlayController';
import { PetCareThreeStage } from '../../game/pet/care/PetCareThreeStage';
import { gameEventBus } from '../../game/eventBus';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import { PET_KIBBLE_BASIC_SKU } from '../../shared/inventory/inventoryRules';
import { PetCareJ4lpanPortrait } from './PetCareJ4lpanPortrait';

interface PetCareTouchOverlayProps {
  active: boolean;
  petSnapshot: PetSnapshot | null;
  localUserId?: string;
  kibbleCount?: number;
  onExit: () => void;
}

/** Cozy 3D Pet Care chrome — minimal copy, tactile interactions directly on Quýt & sunlit room. */
export function PetCareTouchOverlay({
  active,
  petSnapshot,
  localUserId,
  kibbleCount = 0,
  onExit,
}: PetCareTouchOverlayProps) {
  const [hint, setHint] = useState('');
  const [goalsLabel, setGoalsLabel] = useState('');
  const [activeTool, setActiveTool] = useState<CarePlayTool>('hand');
  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const kibbleCountRef = useRef(kibbleCount);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    kibbleCountRef.current = kibbleCount;
  }, [kibbleCount]);

  const showTransientHint = (msg: string) => {
    setHint(msg);
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setHint(''), 2400);
  };

  useEffect(() => {
    if (!active) return;
    return gameEventBus.on('evt:pet-care-session-goals', ({ count, total }) => {
      setGoalsLabel(count > 0 ? `${count}/${total}` : '');
    });
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const host = stageHostRef.current;
    if (!host) return;

    const stage = new PetCareThreeStage({
      host,
      localUserId,
      onToolChange: (tool) => setActiveTool(tool),
      onHint: (msg) => showTransientHint(msg),
      onPartnerCarePulse: (msg) => showTransientHint(msg),
      onFoodBowlClick: () => {
        if (kibbleCountRef.current > 0) {
          gameEventBus.emit('cmd:pet-care-action', {
            kind: 'offer_food',
            sku: PET_KIBBLE_BASIC_SKU,
            quality: 'normal',
            ownerScope: 'shared',
          });
          showTransientHint('Đổ hạt vào bát…');
        } else {
          gameEventBus.emit('cmd:pet-care-action', { kind: 'offer_food' });
          showTransientHint('Đặt thức ăn cho Quýt…');
        }
      },
    });

    return () => {
      stage.dispose();
    };
  }, [active, localUserId]);

  const shownTool: CarePlayTool = active ? activeTool : 'hand';

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
    showTransientHint(msg);
  };

  const handleOfferFoodClick = () => {
    if (kibbleCount > 0) {
      gameEventBus.emit('cmd:pet-care-action', {
        kind: 'offer_food',
        sku: PET_KIBBLE_BASIC_SKU,
        quality: 'normal',
        ownerScope: 'shared',
      });
      showTransientHint('Đặt hạt vào bát…');
    } else {
      gameEventBus.emit('cmd:pet-care-action', { kind: 'offer_food' });
      showTransientHint('Đặt đồ ăn mẫu cho Quýt…');
    }
  };

  if (!active) return null;

  return (
    <div
      className="pet-care-overlay"
      data-testid="pet-care-overlay"
      aria-label="Chế độ chăm sóc mèo"
    >
      <div
        ref={stageHostRef}
        className="pet-care-three-host"
        data-testid="pet-care-three-host"
      />
      <div className="pet-care-overlay__vignette" />
      <PetCareJ4lpanPortrait active={active} fallbackSnapshot={petSnapshot} />
      <p className="pet-care-overlay__title">
        Chăm sóc {petSnapshot?.name || 'Quýt'}
        {goalsLabel ? ` · ${goalsLabel}` : ''}
      </p>
      {hint ? (
        <p className="pet-care-overlay__hint" data-testid="pet-care-stroke-hint">
          {hint}
        </p>
      ) : (
        <p className="pet-care-overlay__hint pet-care-overlay__hint--ghost" data-testid="pet-care-stroke-hint">
          Vuốt chạm trực tiếp · dùng đồ chơi &amp; bát ăn
        </p>
      )}
      <div className="pet-care-overlay__actions">
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-call"
          onClick={withHint('Gọi Quýt…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'call' }))}
        >
          Gọi
        </button>
        <button
          type="button"
          className={`pet-care-overlay__chip ${shownTool === 'brush' ? 'pet-care-overlay__chip--active' : ''}`}
          data-testid="pet-care-brush"
          onClick={withHint(
            shownTool === 'brush' ? 'Cất lược' : 'Chải lông trên người Quýt…',
            () => gameEventBus.emit('cmd:pet-care-action', { kind: 'brush' }),
          )}
        >
          Chải
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-feed"
          onClick={handleOfferFoodClick}
        >
          Cho ăn
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-water"
          onClick={withHint('Rót nước mát…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'pour_water' }))}
        >
          Nước
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-ball"
          onClick={withHint('Ném bóng chuông…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_ball' }))}
        >
          Bóng
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-yarn"
          onClick={withHint('Lăn cuộn len…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_yarn' }))}
        >
          Cuộn len
        </button>
        <button
          type="button"
          className={`pet-care-overlay__chip ${shownTool === 'wand' ? 'pet-care-overlay__chip--active' : ''}`}
          data-testid="pet-care-wand"
          onClick={withHint(
            shownTool === 'wand' ? 'Cất cần câu' : 'Đưa cần câu lông vũ…',
            () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_wand' }),
          )}
        >
          Cần câu
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-box"
          onClick={withHint('Đặt hộp giấy…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_box' }))}
        >
          Hộp giấy
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-observe"
          onClick={withHint('Quan sát…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'observe' }))}
        >
          Quan sát
        </button>
      </div>
      <button type="button" className="pet-care-overlay__exit" data-testid="pet-care-exit" onClick={onExit}>
        Thoát
      </button>
    </div>
  );
}
