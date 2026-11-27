import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Globe, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react';

interface RemoteShareStatus {
  active: boolean;
  tunnelStatus: 'idle' | 'starting' | 'ready' | 'error';
  provider: string | null;
  shareUrl: string | null;
  publicShareUrl?: string | null;
  lanShareUrl: string | null;
  tunnelError: string | null;
}

interface RemoteShareModalProps {
  onClose: () => void;
}

async function fetchRemoteShareStatusJson(): Promise<{
  ok: boolean;
  data?: RemoteShareStatus;
  message?: string;
}> {
  const res = await fetch('/api/dev-lan/remote-share');
  return (await res.json()) as { ok: boolean; data?: RemoteShareStatus; message?: string };
}

export function RemoteShareModal({ onClose }: RemoteShareModalProps) {
  const [status, setStatus] = useState<RemoteShareStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    try {
      const json = await fetchRemoteShareStatusJson();
      if (json.ok && json.data) {
        setStatus(json.data);
      } else if (!json.ok && json.message) {
        setError(json.message);
      }
    } catch {
      setError('Không kết nối được tới máy chủ dev.');
    }
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    void fetchRemoteShareStatusJson()
      .then((json) => {
        if (cancelled) return;
        if (json.ok && json.data) {
          setStatus(json.data);
        } else if (!json.ok && json.message) {
          setError(json.message);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Không kết nối được tới máy chủ dev.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || !status?.active || status.tunnelStatus !== 'starting') return;
    const timer = window.setInterval(() => {
      void loadStatus();
    }, 1200);
    return () => window.clearInterval(timer);
  }, [loadStatus, status?.active, status?.tunnelStatus]);

  if (!import.meta.env.DEV) return null;

  const handleStart = async (refresh = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/dev-lan/remote-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      const json = (await res.json()) as { ok: boolean; data?: RemoteShareStatus; message?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.message ?? 'Không bật được đường link chia sẻ.');
      } else {
        setStatus(json.data);
      }
    } catch {
      setError('Không kết nối được tới máy chủ dev.');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setError(null);
    try {
      await fetch('/api/dev-lan/remote-share', { method: 'DELETE' });
      await loadStatus();
    } catch {
      setError('Không tắt được chia sẻ từ xa.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => {
        setCopiedUrl((prev) => (prev === url ? null : prev));
      }, 2000);
    } catch {
      setError('Trình duyệt không cho phép sao chép tự động — hãy bôi đen link để copy.');
    }
  };

  const primaryUrl =
    status?.publicShareUrl ??
    (status?.tunnelStatus === 'error' || status?.tunnelStatus === 'idle' ? (status?.shareUrl ?? null) : null);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Chơi cùng người thương">
      <div className="modal-panel" data-testid="remote-share-modal">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={18} /> Chơi cùng người thương
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
          Tạo đường link HTTPS riêng tư qua Cloudflare Tunnel để bạn gái vào thẳng nhân vật{' '}
          <strong>Nắng</strong> chỉ với một chạm — không cần cài VPN hay Tailscale.
        </p>

        {error && (
          <div className="cozy-alert cozy-alert--error" style={{ fontSize: 13 }}>
            {error}
          </div>
        )}

        {!status?.active ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="btn btn--primary"
              data-testid="remote-share-start-btn"
              disabled={busy}
              onClick={() => void handleStart(false)}
            >
              <ShieldCheck size={17} /> {busy ? 'Đang khởi tạo...' : 'Tạo đường link mời từ xa'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              className="cozy-card"
              style={{
                padding: 12,
                background: 'var(--surface-warm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>
                  {status.tunnelStatus === 'ready'
                    ? 'Đường link HTTPS riêng tư đã sẵn sàng'
                    : status.tunnelStatus === 'starting'
                      ? 'Đang khởi tạo link HTTPS riêng tư...'
                      : 'Không mở được đường hầm HTTPS công khai'}
                </strong>
                {status.provider && (
                  <span className="pill" style={{ fontSize: 11 }}>
                    {status.provider}
                  </span>
                )}
              </div>

              {status.tunnelStatus === 'starting' && (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-muted)' }} data-testid="remote-share-starting-note">
                  Đang tạo một đường link HTTPS bền vững duy nhất (hoạt động ổn định khi chuyển Wi-Fi ↔ 5G)... thường mất 3–10 giây.
                </p>
              )}

              {status.tunnelError && (
                <p style={{ margin: 0, fontSize: 12.5, color: '#b4483a' }}>
                  {status.tunnelError}
                </p>
              )}

              {primaryUrl && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={primaryUrl}
                    data-testid="remote-share-url-input"
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--border-honey)',
                      background: '#fffdf9',
                      color: 'var(--ink)',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    data-testid="remote-share-copy-btn"
                    onClick={() => void handleCopy(primaryUrl)}
                  >
                    {copiedUrl === primaryUrl ? <Check size={15} /> : <Copy size={15} />}
                    {copiedUrl === primaryUrl ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              )}

              {status.tunnelStatus === 'error' && primaryUrl && (
                <p style={{ margin: 0, fontSize: 12, color: '#b4483a' }}>
                  Lưu ý: Link Wi-Fi nội bộ ở trên không tự kết nối lại được nếu người thương chuyển sang 4G/5G. Hãy thử bấm «Đổi link mới» khi mạng ổn định để lấy link HTTPS.
                </p>
              )}
            </div>

            <div
              style={{
                padding: 10,
                borderRadius: 10,
                background: 'rgba(255, 248, 239, 0.7)',
                border: '1px solid var(--border-honey)',
                fontSize: 12.5,
                lineHeight: 1.5,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <Smartphone size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Gửi link cho <strong>Nắng</strong> qua Messenger/Zalo. Khi mở trên Safari iPhone, nhấn nút{' '}
                <em>Chia sẻ → Thêm vào Màn hình chính</em> để chơi toàn màn hình.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={busy}
                onClick={() => void handleStart(true)}
              >
                <RefreshCw size={14} /> Đổi link mới
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="remote-share-stop-btn"
                disabled={busy}
                onClick={() => void handleStop()}
              >
                Tắt chia sẻ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
