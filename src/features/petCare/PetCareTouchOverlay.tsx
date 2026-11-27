import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CarePlayTool } from '../../game/pet/care/catPlayController';
import { PetCareThreeStage } from '../../game/pet/care/PetCareThreeStage';
import {
  detectDefaultPetCareQuality,
  PET_CARE_QUALITY_CONFIG,
  type PetCareQualityPreset,
} from '../../game/pet/care/petCareQuality';
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

const QUALITY_ORDER: PetCareQualityPreset[] = ['low', 'medium', 'high'];

/** Cozy 3D Pet Care chrome — minimal copy, tactile interactions directly on Quýt, audio & quality controls. */
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
  const [qualityPreset, setQualityPreset] = useState<PetCareQualityPreset>(() => detectDefaultPetCareQuality());
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.7);
  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<PetCareThreeStage | null>(null);
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
    stageRef.current = stage;
    const a = stage.getAudioState();
    setQualityPreset(stage.getQualityPreset());
    setAudioMuted(a.muted);
    setAudioVolume(a.volume);

    return () => {
      stageRef.current = null;
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

  const triggerCareAction = (msg: string, action: () => void) => {
    stageRef.current?.unlockAudio();
    action();
    showTransientHint(msg);
  };

  const handleOfferFoodClick = () => {
    stageRef.current?.unlockAudio();
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

  const handleQualityChange = (preset: PetCareQualityPreset) => {
    stageRef.current?.unlockAudio();
    setQualityPreset(preset);
    stageRef.current?.setQualityPreset(preset);
    showTransientHint(`Đồ họa: ${PET_CARE_QUALITY_CONFIG[preset].labelVi}`);
  };

  const handleToggleMute = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    stageRef.current?.setAudioMuted(next);
  };

  const handleVolumeChange = (nextVol: number) => {
    setAudioVolume(nextVol);
    if (audioMuted && nextVol > 0) {
      setAudioMuted(false);
      stageRef.current?.setAudioMuted(false);
    }
    stageRef.current?.setAudioVolume(nextVol);
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

      <div className="pet-care-overlay__top-controls">
        <div className="pet-care-audio-bar" role="group" aria-label="Âm thanh chăm sóc mèo">
          <button
            type="button"
            className="pet-care-icon-btn"
            data-testid="pet-care-mute"
            aria-label={audioMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
            title={audioMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
            onClick={handleToggleMute}
          >
            {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            className="pet-care-volume-slider"
            data-testid="pet-care-volume"
            aria-label="Âm lượng"
            min={0}
            max={1}
            step={0.05}
            value={audioMuted ? 0 : audioVolume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
          />
        </div>

        <div className="pet-care-quality-bar" role="group" aria-label="Chất lượng đồ họa">
          {QUALITY_ORDER.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`pet-care-quality-pill ${qualityPreset === preset ? 'pet-care-quality-pill--active' : ''}`}
              data-testid={`pet-care-quality-${preset}`}
              onClick={() => handleQualityChange(preset)}
            >
              {PET_CARE_QUALITY_CONFIG[preset].labelVi}
            </button>
          ))}
        </div>

        <button type="button" className="pet-care-overlay__exit" data-testid="pet-care-exit" onClick={onExit}>
          Thoát
        </button>
      </div>

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
          onClick={() => triggerCareAction('Gọi Quýt…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'call' }))}
        >
          Gọi
        </button>
        <button
          type="button"
          className={`pet-care-overlay__chip ${shownTool === 'brush' ? 'pet-care-overlay__chip--active' : ''}`}
          data-testid="pet-care-brush"
          onClick={() =>
            triggerCareAction(
              shownTool === 'brush' ? 'Cất lược' : 'Chải lông trên người Quýt…',
              () => gameEventBus.emit('cmd:pet-care-action', { kind: 'brush' }),
            )
          }
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
          onClick={() => triggerCareAction('Rót nước mát…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'pour_water' }))}
        >
          Nước
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-ball"
          onClick={() => triggerCareAction('Ném bóng chuông…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_ball' }))}
        >
          Bóng
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-yarn"
          onClick={() => triggerCareAction('Lăn cuộn len…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_yarn' }))}
        >
          Cuộn len
        </button>
        <button
          type="button"
          className={`pet-care-overlay__chip ${shownTool === 'wand' ? 'pet-care-overlay__chip--active' : ''}`}
          data-testid="pet-care-wand"
          onClick={() =>
            triggerCareAction(
              shownTool === 'wand' ? 'Cất cần câu' : 'Đưa cần câu lông vũ…',
              () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_wand' }),
            )
          }
        >
          Cần câu
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-box"
          onClick={() => triggerCareAction('Đặt hộp giấy…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_box' }))}
        >
          Hộp giấy
        </button>
        <button
          type="button"
          className="pet-care-overlay__chip"
          data-testid="pet-care-observe"
          onClick={() => triggerCareAction('Quan sát…', () => gameEventBus.emit('cmd:pet-care-action', { kind: 'observe' }))}
        >
          Quan sát
        </button>
      </div>
    </div>
  );
}
