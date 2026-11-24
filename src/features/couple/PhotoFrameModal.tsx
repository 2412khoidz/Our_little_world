import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';
import { STATIC_PHOTO_PRESETS } from '../../shared/couple/coupleTypes';

interface PhotoFrameModalProps {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  onClose: () => void;
}

export function PhotoFrameModal({
  selectedPresetId,
  onSelectPreset,
  onClose,
}: PhotoFrameModalProps) {
  const index = Math.max(
    0,
    STATIC_PHOTO_PRESETS.findIndex((p) => p.id === selectedPresetId),
  );
  const current = STATIC_PHOTO_PRESETS[index] ?? STATIC_PHOTO_PRESETS[0]!;

  function stepPreset(delta: number) {
    const nextIndex = (index + delta + STATIC_PHOTO_PRESETS.length) % STATIC_PHOTO_PRESETS.length;
    const next = STATIC_PHOTO_PRESETS[nextIndex];
    if (next) onSelectPreset(next.id);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="photo-frame-modal">
      <div className="modal-panel" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={18} /> Khung ảnh kỷ niệm
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            borderRadius: 14,
            border: '4px solid #c99765',
            background: `linear-gradient(160deg, ${current.skyHex} 0%, ${current.accentHex} 100%)`,
            padding: '18px 16px',
            minHeight: 150,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'inset 0 2px 10px rgba(45, 29, 34, 0.14)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              className="pill"
              style={{
                background: 'rgba(255, 248, 239, 0.88)',
                color: '#4c3239',
                fontSize: 11.5,
              }}
            >
              {current.dateLabel}
            </span>
            <span style={{ fontSize: 18 }}>🌸🏡🐱</span>
          </div>

          <div style={{ textAlign: 'center', padding: '14px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#392228' }}>{current.titleVi}</div>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#4d3238', lineHeight: 1.45 }}>
              {current.captionVi}
            </p>
          </div>

          <div style={{ textAlign: 'right', fontSize: 11.5, color: '#5b3f45' }}>
            Bản xem trước ảnh tĩnh V0.1.5 (0₫)
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            data-testid="photo-prev"
            onClick={() => stepPreset(-1)}
          >
            <ChevronLeft size={16} /> Trước
          </button>
          <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
            {index + 1} / {STATIC_PHOTO_PRESETS.length}
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            data-testid="photo-next"
            onClick={() => stepPreset(1)}
          >
            Tiếp <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
          Ảnh tải lên riêng tư của hai người (tối đa 5 MB) sẽ được mở ở V0.3 trong phần Kỷ niệm chung.
        </div>
      </div>
    </div>
  );
}
