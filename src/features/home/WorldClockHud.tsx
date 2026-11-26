import type { WorldClockPresentation } from '../../shared/world/worldClock';
import type { TimeOfDayMode } from '../../shared/donor/ai-farm-xay-nha/dayCyclePresentation';

interface WorldClockHudProps {
  presentation: WorldClockPresentation;
  mode: TimeOfDayMode;
  hidden?: boolean;
  /** Shared farm wallet (Kiln Harvest gold coin HUD). */
  walletCoins?: number | null;
  onModeChange: (mode: TimeOfDayMode) => void;
}

function WeatherIcon({ kind }: { kind: WorldClockPresentation['weather']['kind'] }) {
  const icon = kind === 'drizzle' ? 'rain' : kind === 'cloudy' ? 'cloud' : 'sun';
  return (
    <img
      src={`/assets/ui/hybrid/emotes/${icon}.png`}
      alt=""
      width={16}
      height={16}
      draggable={false}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
}

export function WorldClockHud({
  presentation,
  mode,
  hidden = false,
  walletCoins = null,
  onModeChange,
}: WorldClockHudProps) {
  if (hidden) return null;

  const timeIcon = presentation.clockIcon === 'moon' ? 'moon' : 'sun';
  const showWallet = walletCoins !== null && walletCoins !== undefined;

  return (
    <div className="world-clock-hud" data-testid="world-clock-hud" role="group" aria-label="Thời gian trong ngày">
      {showWallet ? (
        <span className="world-clock-hud__pill world-clock-hud__pill--wallet" data-testid="world-clock-wallet">
          <img
            src="/assets/ui/hybrid/items/coin.png"
            alt=""
            width={18}
            height={18}
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
          <span>
            <strong>{walletCoins}</strong>
            <small>xu chung</small>
          </span>
        </span>
      ) : null}
      <span className="world-clock-hud__pill">
        <img
          src={`/assets/ui/hybrid/emotes/${timeIcon}.png`}
          alt=""
          width={17}
          height={17}
          draggable={false}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
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