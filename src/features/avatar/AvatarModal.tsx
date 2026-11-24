import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { renderAvatarPreviewCanvas } from '../../game/art/avatarSpriteBuilder';
import {
  ACCESSORY_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  OUTFIT_STYLE_OPTIONS,
  SKIN_TONE_OPTIONS,
} from '../../shared/avatar';
import type { AvatarConfig } from '../../shared/types';

interface AvatarModalProps {
  initialNickname: string;
  initialConfig: AvatarConfig;
  onSave: (nickname: string, config: AvatarConfig) => Promise<boolean>;
  onClose: () => void;
}

export function AvatarModal({
  initialNickname,
  initialConfig,
  onSave,
  onClose,
}: AvatarModalProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderAvatarPreviewCanvas(canvasRef.current, config, 5);
    }
  }, [config]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setBusy(true);
    const ok = await onSave(nickname.trim(), config);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Tùy chỉnh ngoại hình">
      <form className="modal-panel" onSubmit={(e) => void handleSubmit(e)}>
        <div className="modal-header">
          <h2 className="modal-title">Tủ đồ & Ngoại hình</h2>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: 12,
            borderRadius: 14,
            background: 'var(--surface-warm)',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: 80, height: 120, imageRendering: 'pixelated', flexShrink: 0 }}
          />
          <label style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>
            Biệt danh hiển thị
            <input
              className="input"
              required
              maxLength={32}
              data-testid="input-avatar-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Tông da</div>
          <div className="chip-grid">
            {SKIN_TONE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip ${config.skinTone === opt.id ? 'chip--selected' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, skinTone: opt.id }))}
              >
                <span className="swatch" style={{ background: opt.baseHex }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Kiểu tóc & Màu tóc</div>
          <div className="chip-grid" style={{ marginBottom: 8 }}>
            {HAIR_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip ${config.hairStyle === opt.id ? 'chip--selected' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, hairStyle: opt.id }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="chip-grid">
            {HAIR_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip ${config.hairColor === opt.id ? 'chip--selected' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, hairColor: opt.id }))}
              >
                <span className="swatch" style={{ background: opt.baseHex }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Trang phục & Màu áo</div>
          <div className="chip-grid" style={{ marginBottom: 8 }}>
            {OUTFIT_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip ${config.outfitStyle === opt.id ? 'chip--selected' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, outfitStyle: opt.id }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="chip-grid">
            {OUTFIT_COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip ${config.outfitColor === opt.id ? 'chip--selected' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, outfitColor: opt.id }))}
              >
                <span className="swatch" style={{ background: opt.baseHex }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Phụ kiện nhỏ</div>
          <div className="chip-grid">
            {ACCESSORY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip ${config.accessory === opt.id ? 'chip--selected' : ''}`}
                onClick={() => setConfig((prev) => ({ ...prev, accessory: opt.id }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy}
          data-testid="btn-save-avatar"
        >
          <Check size={16} /> {busy ? 'Đang lưu...' : 'Lưu ngoại hình'}
        </button>
      </form>
    </div>
  );
}
