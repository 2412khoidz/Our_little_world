import { useEffect, useRef, useState } from 'react';
import { Check, RotateCw, X } from 'lucide-react';
import {
  drawCozyWardrobePreview,
  loadCozyWardrobeAvatarAtlas,
} from '../../game/art/donorAvatarWardrobePreview';
import {
  AVATAR_ATLAS_ROW_IDLE,
  AVATAR_ATLAS_ROW_SIT,
  AVATAR_ATLAS_ROW_WALK,
} from '../../game/art/avatarAtlasLayout';
import {
  ACCESSORY_OPTIONS,
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  OUTFIT_STYLE_OPTIONS,
  SKIN_TONE_OPTIONS,
  avatarConfigsEqual,
} from '../../shared/avatar';
import type { AvatarConfig, Direction } from '../../shared/types';

interface AvatarModalProps {
  initialNickname: string;
  initialConfig: AvatarConfig;
  onSave: (nickname: string, config: AvatarConfig) => Promise<boolean>;
  onClose: () => void;
}

const PARTNER_PRESETS: { id: 'may' | 'nang'; label: string; config: AvatarConfig }[] = [
  { id: 'may', label: 'Mây (nam • ấm áp)', config: DEFAULT_AVATAR_PARTNER_A },
  { id: 'nang', label: 'Nắng (nữ • dịu dàng)', config: DEFAULT_AVATAR_PARTNER_B },
];

const PREVIEW_POSES: { id: 'idle' | 'walk' | 'sit'; label: string; row: number }[] = [
  { id: 'idle', label: 'Đứng', row: AVATAR_ATLAS_ROW_IDLE },
  { id: 'walk', label: 'Đi bộ', row: AVATAR_ATLAS_ROW_WALK },
  { id: 'sit', label: 'Ngồi', row: AVATAR_ATLAS_ROW_SIT },
];

const PREVIEW_DIRS: readonly Direction[] = ['down', 'left', 'up', 'right'];

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
  const [atlas, setAtlas] = useState<HTMLImageElement | null>(null);
  const [poseId, setPoseId] = useState<'idle' | 'walk' | 'sit'>('idle');
  const [dirIdx, setDirIdx] = useState(0);
  const [frameTick, setFrameTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    void loadCozyWardrobeAvatarAtlas().then((image) => {
      if (mounted) setAtlas(image);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFrameTick((t) => (t + 1) % 6);
    }, poseId === 'walk' ? 120 : 210);
    return () => window.clearInterval(interval);
  }, [poseId]);

  useEffect(() => {
    if (canvasRef.current) {
      const row = PREVIEW_POSES.find((p) => p.id === poseId)?.row ?? AVATAR_ATLAS_ROW_IDLE;
      const dir = PREVIEW_DIRS[dirIdx] ?? 'down';
      drawCozyWardrobePreview(canvasRef.current, atlas, config, 5, row, dir, frameTick);
    }
  }, [atlas, config, poseId, dirIdx, frameTick]);

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <canvas
              ref={canvasRef}
              data-testid="avatar-preview-canvas"
              data-atlas-ready={Boolean(atlas)}
              style={{ width: 80, height: 125, imageRendering: 'pixelated', flexShrink: 0 }}
            />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              {PREVIEW_POSES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`chip ${poseId === p.id ? 'chip--selected' : ''}`}
                  style={{ padding: '2px 7px', fontSize: 11 }}
                  onClick={() => setPoseId(p.id)}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                style={{ padding: '2px 7px', fontSize: 11 }}
                aria-label="Xoay hướng xem trước"
                title="Xoay hướng"
                onClick={() => setDirIdx((d) => (d + 1) % PREVIEW_DIRS.length)}
              >
                <RotateCw size={12} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Tủ đồ và thế giới dùng chung một nhân vật — mọi thay đổi được đồng bộ ngay cho người thương.
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Mẫu gợi ý cặp đôi</div>
          <div className="chip-grid">
            {PARTNER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                data-testid={`avatar-preset-${preset.id}`}
                className={`chip ${avatarConfigsEqual(config, preset.config) ? 'chip--selected' : ''}`}
                onClick={() => setConfig({ ...preset.config })}
              >
                {preset.label}
              </button>
            ))}
          </div>
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
