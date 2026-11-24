import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export function PwaStatusBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(54px + env(safe-area-inset-top, 0px))',
        left: 12,
        right: 12,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div className="toast-banner" role="status">
        <span>Có phiên bản mới của ngôi nhà.</span>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void updateServiceWorker(true)}
        >
          <RefreshCw size={14} /> Cập nhật ngay
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => setNeedRefresh(false)}
        >
          Để sau
        </button>
      </div>
    </div>
  );
}
