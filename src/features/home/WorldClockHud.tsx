import { Cloud, CloudRain, Moon, Sun } from 'lucide-react';
import type { WorldClockPresentation } from '../../shared/world/worldClock';
import type { TimeOfDayMode } from '../../shared/donor/ai-farm-xay-nha/dayCyclePresentation';
import { CABACOS_UI_INVENTORY_REGISTRY } from '../../shared/donor/cabacos-79e423d/uiInventoryRegistry';

interface WorldClockHudProps {
  presentation: WorldClockPresentation;
  mode: TimeOfDayMode;
  hidden?: boolean;
  /** Shared farm wallet (Cabacos GameHud money panel — read-only). */
  walletCoins?: number | null;
  onModeChange: (mode: TimeOfDayMode) => void;
}

function WeatherIcon({ kind }: { kind: WorldClockPresentation['weather']['kind'] }) {
  if (kind === 'drizzle') return <CloudRain size={14} aria-hidden />;
  if (kind === 'cloudy') return <Cloud size={14} aria-hidden />;
  return null;
}

export function WorldClockHud({
  presentation,
  mode,
  hidden = false,
  walletCoins = null,
  onModeChange,
}: WorldClockHudProps) {
  if (hidden) return null;

  const TimeIcon = presentation.clockIcon === 'moon' ? Moon : Sun;
  const showWallet = walletCoins !== null && walletCoins !== undefined;

  return (
    <div className="world-clock-hud" data-testid="world-clock-hud" role="group" aria-label="Thời gian trong ngày">
      {showWallet ? (
        <span className="world-clock-hud__pill world-clock-hud__pill--wallet" data-testid="world-clock-wallet">
          <img
            src={CABACOS_UI_INVENTORY_REGISTRY.coinHud}
            alt=""
            width={18}
            height={18}
            style={{ imageRendering: 'pixelated' }}
          />
          <span>
            <strong>{walletCoins}</strong>
            <small>xu chung</small>
          </span>
        </span>
      ) : null}
      <span className="world-clock-hud__pill">
        <TimeIcon size={15} aria-hidden />
        <span>
          <strong>Ngày {presentation.calendarDay}</strong>
          <small>{presentation.timeLabelVi}</small>
        </span>
      </span>
      <span className="world-clock-hud__weather" title={presentation.weather.labelVi}>
        <WeatherIcon kind={presentation.weather.kind} />
        <small>{presentation.weather.labelVi}</small>
      </span>
      <details className="world-clock-hud__mode">
        <summary className="world-clock-hud__mode-summary">Ánh sáng</summary>
        <div className="world-clock-hud__mode-buttons" role="group" aria-label="Thời gian trong ngày">
          {(
            [
              ['auto', 'Theo giờ thật'],
              ['day', 'Luôn ban ngày'],
              ['night', 'Luôn ban đêm'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? 'is-active' : ''}
              aria-pressed={mode === value}
              onClick={() => onModeChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}