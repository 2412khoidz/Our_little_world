import { useEffect, useState } from 'react';
import { Check, Copy, RefreshCw, X } from 'lucide-react';
import type { WorldBackend } from '../../lib/backend/types';
import type { WorldInviteStatus, WorldMember } from '../../shared/types';

interface InviteModalProps {
  backend: WorldBackend;
  worldId: string;
  members: WorldMember[];
  onClose: () => void;
}

export function InviteModal({ backend, worldId, members, onClose }: InviteModalProps) {
  const [status, setStatus] = useState<WorldInviteStatus | null>(null);
  const [freshCode, setFreshCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void backend.getInviteStatus(worldId).then((res) => {
      if (!active) return;
      if (res.ok) setStatus(res.data);
      else setErrorMsg(res.message);
    });
    return () => {
      active = false;
    };
  }, [backend, worldId]);

  async function handleGenerateInvite() {
    setBusy(true);
    setErrorMsg(null);
    setCopied(false);
    const res = await backend.createInvite(worldId);
    setBusy(false);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }
    setFreshCode(res.data.inviteCode);
    setStatus({ hasActiveInvite: true, expiresAt: res.data.expiresAt });
  }

  async function handleCopy() {
    if (!freshCode) return;
    try {
      await navigator.clipboard.writeText(freshCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const isFull = members.length >= 2;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Mời người thương">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">Ghép cặp ngôi nhà ({members.length}/2)</h2>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map((m) => (
            <div
              key={m.userId}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                background: 'var(--surface-warm)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13.5,
              }}
            >
              <strong>{m.nickname}</strong>
              <span style={{ color: 'var(--ink-muted)' }}>
                {m.role === 'owner' ? 'Chủ nhà' : 'Người thương'}
              </span>
            </div>
          ))}
        </div>

        {errorMsg && <div className="cozy-alert cozy-alert--error">{errorMsg}</div>}

        {isFull ? (
          <div className="cozy-alert cozy-alert--success">
            Ngôi nhà đã đủ hai thành viên. Hệ thống từ chối mọi mã mời hoặc tài khoản thứ ba.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
              Mã mời chỉ dùng được <strong>1 lần duy nhất</strong> để giữ sự riêng tư cho hai bạn.
              Tạo mã mới sẽ tự động hủy mã cũ chưa dùng.
            </p>

            {freshCode && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#fff',
                  border: '2px dashed var(--accent-rose)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <code
                  data-testid="generated-invite-code"
                  style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}
                >
                  {freshCode}
                </code>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => void handleCopy()}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>
            )}

            {!freshCode && status?.hasActiveInvite && (
              <div className="cozy-alert">
                Đang có một mã mời còn hiệu lực (hết hạn:{' '}
                {status.expiresAt ? new Date(status.expiresAt).toLocaleString('vi-VN') : ''}). Vì lý
                do bảo mật, hệ thống không hiển thị lại mã cũ — hãy bấm tạo mã mới nếu cần gửi lại.
              </div>
            )}

            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              data-testid="btn-generate-invite"
              onClick={() => void handleGenerateInvite()}
            >
              <RefreshCw size={16} />
              {freshCode || status?.hasActiveInvite ? 'Tạo mã mời mới' : 'Tạo mã mời ghép đôi'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
