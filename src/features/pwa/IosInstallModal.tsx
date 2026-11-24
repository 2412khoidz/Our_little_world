import { PlusSquare, Share, Smartphone, X } from 'lucide-react';

interface IosInstallModalProps {
  onClose: () => void;
}

export function IosInstallModal({ onClose }: IosInstallModalProps) {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cài đặt PWA trên iPhone">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">Cài đặt như ứng dụng (PWA)</h2>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {isStandalone ? (
          <div className="cozy-alert cozy-alert--success">
            Bạn đang mở ứng dụng ở chế độ toàn màn hình (Standalone PWA)!
          </div>
        ) : (
          <div className="cozy-alert">
            Trên iPhone, Safari không hiện nút cài đặt tự động. Bạn chỉ cần làm 3 bước ngắn bên
            dưới (lưu ý trang phải chạy qua <strong>HTTPS</strong> hoặc localhost để dùng đầy đủ
            Service Worker).
          </div>
        )}

        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
          <li>
            Mở liên kết của <strong>Our Little World</strong> bằng trình duyệt{' '}
            <strong>Safari</strong> trên iPhone.
          </li>
          <li>
            Chạm nút <Share size={15} style={{ verticalAlign: 'text-bottom' }} />{' '}
            <strong>Chia sẻ (Share)</strong> ở thanh công cụ dưới cùng.
          </li>
          <li>
            Cuộn xuống chọn <PlusSquare size={15} style={{ verticalAlign: 'text-bottom' }} />{' '}
            <strong>Thêm vào MH chính (Add to Home Screen)</strong> → bấm <strong>Thêm</strong>.
          </li>
        </ol>

        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: 'var(--surface-warm)',
            fontSize: 12.5,
            color: 'var(--ink-muted)',
          }}
        >
          <Smartphone size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Service Worker chỉ lưu giao diện và pixel art tĩnh; dữ liệu tài khoản và video không bao
          giờ bị cache trong PWA.
        </div>
      </div>
    </div>
  );
}
