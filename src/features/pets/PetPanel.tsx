import { useEffect, useState } from 'react';
import { Cat, Droplets, Heart, Sparkles, Utensils, Volume2, VolumeX, X } from 'lucide-react';
import {
  getPetActionCooldownRemainingMs,
  getPetMoodLabelVi,
} from '../../shared/pet/petNeeds';
import { gameEventBus } from '../../game/eventBus';
import type { PetActionType, PetSnapshot } from '../../shared/pet/petTypes';

interface PetPanelProps {
  pet: PetSnapshot | null;
  kibbleCount: number;
  canClaimFreeKibble: boolean;
  busy: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onAdoptOrRename: (name: string) => Promise<void>;
  onInteract: (action: PetActionType) => Promise<void>;
  onClaimFreeKibble: () => Promise<void>;
  onClose: () => void;
}

function VitalBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: 'rgba(107, 75, 62, 0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            background: color,
            borderRadius: 99,
            transition: 'width 240ms ease',
          }}
        />
      </div>
    </div>
  );
}

export function PetPanel({
  pet,
  kibbleCount,
  canClaimFreeKibble,
  busy,
  muted,
  onToggleMute,
  onAdoptOrRename,
  onInteract,
  onClaimFreeKibble,
  onClose,
}: PetPanelProps) {
  const [nameInput, setNameInput] = useState(pet?.name ?? 'Quýt');
  const [editingName, setEditingName] = useState(!pet);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const now = (pet?.serverNowMs ?? 0) + tick * 1000;
  const feedCdSec = pet ? Math.ceil(getPetActionCooldownRemainingMs('feed', pet.lastFedAtMs, now) / 1000) : 0;
  const petCdSec = pet ? Math.ceil(getPetActionCooldownRemainingMs('pet', pet.lastPettedAtMs, now) / 1000) : 0;
  const waterCdSec = pet ? Math.ceil(getPetActionCooldownRemainingMs('water', pet.lastWateredAtMs, now) / 1000) : 0;

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    const clean = nameInput.trim();
    if (!clean) return;
    await onAdoptOrRename(clean);
    setEditingName(false);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Góc bé mèo cam">
      <div className="modal-panel" data-testid="pet-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            <Cat size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {pet ? `Bé mèo ${pet.name}` : 'Nhận nuôi bé mèo cam'}
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={onToggleMute}
              aria-label={muted ? 'Bật tiếng mèo' : 'Tắt tiếng mèo'}
              title={muted ? 'Bật tiếng mèo' : 'Tắt tiếng mèo'}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
              <X size={16} />
            </button>
          </div>
        </div>

        {!pet || editingName ? (
          <form onSubmit={(e) => void handleSaveName(e)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="cozy-alert" style={{ fontSize: 13 }}>
              {pet
                ? 'Đổi tên gọi thân thương cho chú mèo cam của hai bạn:'
                : 'Một bé mèo mướp cam nhỏ đang nằm ngủ ở góc nhà. Hãy đặt tên để cùng chăm sóc bé nhé (miễn phí 0₫).'}
            </div>
            <input
              className="input"
              maxLength={24}
              required
              data-testid="input-pet-name"
              placeholder="Tên bé mèo (vd: Quýt, Mochi...)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="btn btn--primary"
                style={{ flex: 1 }}
                disabled={busy}
                data-testid="btn-pet-save-name"
              >
                {pet ? 'Lưu tên mới' : 'Nhận nuôi bé mèo'}
              </button>
              {pet && (
                <button type="button" className="btn btn--secondary" onClick={() => setEditingName(false)}>
                  Hủy
                </button>
              )}
            </div>
          </form>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--surface-warm)',
                border: '1px solid var(--border-honey)',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 14.5 }} data-testid="pet-name-heading">
                  {pet.name}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  Tâm trạng: <strong>{getPetMoodLabelVi(pet.emotion)}</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="btn-pet-edit-name"
                onClick={() => {
                  setNameInput(pet.name);
                  setEditingName(true);
                }}
              >
                Đổi tên
              </button>
            </div>

            <p
              className="cozy-alert"
              style={{ fontSize: 13, margin: 0 }}
              data-testid="pet-panel-care-hint"
            >
              Vuốt ve, chải lông &amp; chơi cùng {pet.name} trực tiếp trong phòng khách ấm áp.
            </p>

            <button
              type="button"
              className="btn btn--primary"
              data-testid="pet-panel-enter-care"
              onClick={() => {
                gameEventBus.emit('cmd:pet-care-mode', { active: true });
                onClose();
              }}
            >
              <Cat size={16} /> Chăm sóc {pet.name} (3D)
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <VitalBar label="Độ no (giảm chậm theo giờ)" value={pet.vitals.hunger} color="#e58f65" />
              <VitalBar label="Năng lượng (tự nghỉ ngơi ≥ 50)" value={pet.vitals.energy} color="#76a880" />
              <VitalBar label="Vui vẻ" value={pet.vitals.fun} color="#df7b96" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
              <span>
                Hạt mèo trong túi chung: <strong data-testid="pet-kibble-count">{kibbleCount}</strong>
              </span>
              {canClaimFreeKibble && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  disabled={busy}
                  data-testid="btn-pet-claim-kibble"
                  onClick={() => void onClaimFreeKibble()}
                >
                  <Sparkles size={13} /> Lấy hạt 0₫
                </button>
              )}
            </div>

            <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.45, color: 'var(--ink-muted, #6b4b3e)' }}>
              Giai đoạn chuyển tiếp: hai nút dưới chỉ đổ thức ăn/nước vào bát — bé chưa tự ăn uống trên máy chủ
              (Mission 04).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={busy || petCdSec > 0}
                data-testid="btn-pet-pet"
                onClick={() => void onInteract('pet')}
              >
                <Heart size={14} /> {petCdSec > 0 ? `${petCdSec}s` : 'Vuốt ve'}
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={busy || feedCdSec > 0 || kibbleCount <= 0}
                data-testid="btn-pet-feed"
                onClick={() => void onInteract('feed')}
              >
                <Utensils size={14} /> {feedCdSec > 0 ? `${feedCdSec}s` : 'Đổ vào bát ăn'}
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={busy || waterCdSec > 0}
                data-testid="btn-pet-water"
                onClick={() => void onInteract('water')}
              >
                <Droplets size={14} /> {waterCdSec > 0 ? `${waterCdSec}s` : 'Rót vào bát nước'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
