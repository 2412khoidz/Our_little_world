import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  TOUCH_PREF_LIMITS,
  isLikelyMobileViewport,
  resetTouchPreferences,
  resolveEffectiveShotCameraMode,
  saveTouchPreferences,
  type BilliardsTouchPreferences,
} from './touchPreferences';

export interface BilliardsTouchCameraSettingsProps {
  prefs: BilliardsTouchPreferences;
  onChange: (next: BilliardsTouchPreferences) => void;
  showCameraRotation?: boolean;
  showShotCameraMode?: boolean;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  testId: string;
  onInput: (val: number) => void;
}

const SensitivityRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  testId,
  onInput,
}) => (
  <label className="olw-pref-slider-row">
    <div className="olw-pref-slider-head">
      <span>{label}</span>
      <strong style={{ color: '#fbbf24' }}>{value}%</strong>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      data-testid={testId}
      onChange={(e) => onInput(Number(e.target.value))}
      onPointerUp={(e) => e.currentTarget.blur()}
      className="olw-pref-slider"
    />
  </label>
);

export const BilliardsTouchCameraSettings: React.FC<BilliardsTouchCameraSettingsProps> = ({
  prefs,
  onChange,
  showCameraRotation = true,
  showShotCameraMode = false,
}) => {
  const isMobile = isLikelyMobileViewport();
  const effectiveCamStyle = resolveEffectiveShotCameraMode(prefs, isMobile);

  const update = (patch: Partial<BilliardsTouchPreferences>) => {
    const next = saveTouchPreferences({ ...prefs, ...patch });
    onChange(next);
  };

  return (
    <div className="olw-pref-group" data-testid="billiards-touch-settings">
      <div className="olw-modal-row">
        <span className="olw-section-label" style={{ marginBottom: 0 }}>
          Điều khiển cảm ứng
        </span>
        <button
          type="button"
          data-testid="billiards-touch-reset"
          onClick={() => onChange(resetTouchPreferences())}
          className="olw-billiards-pill"
          style={{ height: 26, padding: '0 8px', fontSize: 10.5 }}
        >
          <RotateCcw size={11} /> Mặc định
        </button>
      </div>

      <SensitivityRow
        label="Độ nhạy ngắm cơ"
        value={prefs.aimSensitivityPct}
        min={TOUCH_PREF_LIMITS.aimSensitivityPct.min}
        max={TOUCH_PREF_LIMITS.aimSensitivityPct.max}
        step={TOUCH_PREF_LIMITS.aimSensitivityPct.step}
        testId="billiards-sens-aim"
        onInput={(val) => update({ aimSensitivityPct: val })}
      />

      <SensitivityRow
        label="Tinh chỉnh khi khóa cơ"
        value={prefs.lockedFineSensitivityPct}
        min={TOUCH_PREF_LIMITS.lockedFineSensitivityPct.min}
        max={TOUCH_PREF_LIMITS.lockedFineSensitivityPct.max}
        step={TOUCH_PREF_LIMITS.lockedFineSensitivityPct.step}
        testId="billiards-sens-fine"
        onInput={(val) => update({ lockedFineSensitivityPct: val })}
      />

      {showCameraRotation && (
        <SensitivityRow
          label="Độ nhạy xoay camera"
          value={prefs.cameraRotationSensitivityPct}
          min={TOUCH_PREF_LIMITS.cameraRotationSensitivityPct.min}
          max={TOUCH_PREF_LIMITS.cameraRotationSensitivityPct.max}
          step={TOUCH_PREF_LIMITS.cameraRotationSensitivityPct.step}
          testId="billiards-sens-cam"
          onInput={(val) => update({ cameraRotationSensitivityPct: val })}
        />
      )}

      <SensitivityRow
        label="Độ nhạy thu phóng"
        value={prefs.pinchZoomSensitivityPct}
        min={TOUCH_PREF_LIMITS.pinchZoomSensitivityPct.min}
        max={TOUCH_PREF_LIMITS.pinchZoomSensitivityPct.max}
        step={TOUCH_PREF_LIMITS.pinchZoomSensitivityPct.step}
        testId="billiards-sens-zoom"
        onInput={(val) => update({ pinchZoomSensitivityPct: val })}
      />

      {showShotCameraMode && (
        <div className="olw-pref-cam-style">
          <div className="olw-section-label" style={{ marginBottom: 4 }}>
            Camera khi đánh (3D)
          </div>
          <div className="olw-pref-cam-seg" role="radiogroup" aria-label="Camera khi đánh 3D">
            {(
              [
                { id: 'adaptive', label: 'Điện ảnh' },
                { id: 'overview', label: 'Toàn bàn' },
                { id: 'manual', label: 'Thủ công' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={effectiveCamStyle === item.id}
                data-testid={`billiards-shot-cam-${item.id}`}
                onClick={() => update({ shotCameraMode: item.id })}
                className={`olw-billiards-pill${effectiveCamStyle === item.id ? ' olw-billiards-pill--active' : ''}`}
                style={{ flex: 1, height: 30, fontSize: 11, padding: '0 6px' }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="olw-pref-cam-desc">
            {effectiveCamStyle === 'adaptive'
              ? 'Tự theo dõi bi, mở rộng khi nhiều bi va chạm và về toàn bàn khi dừng.'
              : effectiveCamStyle === 'overview'
                ? 'Luôn nâng lên góc nhìn toàn bàn khi đánh để quan sát kết quả.'
                : 'Giữ nguyên góc camera hiện tại, người chơi tự xoay & thu phóng.'}
          </div>
        </div>
      )}
    </div>
  );
};
