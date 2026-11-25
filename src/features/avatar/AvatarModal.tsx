import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import {
  drawDonorWardrobePreview,
  loadDonorGameplayAvatarSheet,
} from '../../game/art/donorAvatarWardrobePreview';
import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  OUTFIT_COLOR_OPTIONS,
} from '../../shared/avatar';
import type { AvatarConfig } from '../../shared/types';

interface AvatarModalProps {
  initialNickname: string;
  initialConfig: AvatarConfig;
  onSave: (nickname: string, config: AvatarConfig) => Promise<boolean>;
  onClose: () => void;
}

const PARTNER_PRESETS: { id: 'may' | 'nang'; label: string; config: AvatarConfig }[] = [
  { id: 'may', label: 'Mây (áo xanh ấm)', config: DEFAULT_AVATAR_PARTNER_A },
  { id: 'nang', label: 'Nắng (váy hồng dịu)', config: DEFAULT_AVATAR_PARTNER_B },
];

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
  const [sheet, setSheet] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadDonorGameplayAvatarSheet(config).then((image) => {
      if (mounted) setSheet(image);
    });
    return () => {
      mounted = false;
    };
  }, [config]);

  useEffect(() => {
    if (canvasRef.current && sheet) {
      drawDonorWardrobePreview(canvasRef.current, sheet, config, 5);
    }
  }, [sheet, config]);

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
            data-testid="avatar-preview-canvas"
            data-atlas-ready={Boolean(sheet)}
            style={{ width: 80, height: 80, imageRendering: 'pixelated', flexShrink: 0 }}
          />
          <div style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--text)' }}>
              Xem trước đúng nhân vật trong game (Puny CC0 8 hướng).
            </p>
            <p style={{ margin: 0 }}>
              Tùy da/tóc/áo mẫu không đổi hoạt họa donor — chỉ chọn diện mạo Mây/Nắng bên dưới.
            </p>
          </div>
        </div>

        <label style={{ fontSize: 13, fontWeight: 700 }}>
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

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Diện mạo trong thế giới</div>
          <div className="chip-grid">
            {PARTNER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                data-testid={`avatar-preset-${preset.id}`}
                className={`chip ${
                  config.outfitStyle === preset.config.outfitStyle &&
                  config.outfitColor === preset.config.outfitColor
                    ? 'chip--selected'
                    : ''
                }`}
                onClick={() => setConfig({ ...preset.config })}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Tông trang phục (đổi sheet donor)</div>
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