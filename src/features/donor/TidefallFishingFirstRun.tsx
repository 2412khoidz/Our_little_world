import { X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'olw_tidefall_fishing_tutorial_v1';

interface TidefallFishingFirstRunProps {
  spotLabel: string;
}

const panelStyle: CSSProperties = {
  position: 'relative',
  marginBottom: 8,
  padding: '8px 10px 8px 12px',
  borderRadius: 10,
  fontSize: 12,
  lineHeight: 1.45,
  background: 'var(--cozy-panel-muted, rgba(0,0,0,0.06))',
};

/** Lần đầu mở modal câu cá — hướng dẫn Tidefall FSM (tiếng Việt). */
export function TidefallFishingFirstRun({ spotLabel }: TidefallFishingFirstRunProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (dismissed) return null;

  return (
    <div data-testid="tidefall-fishing-first-run" role="note" aria-label="Hướng dẫn câu cá lần đầu" style={panelStyle}>
      <button type="button" className="farm-fish-tutorial__close" aria-label="Đóng hướng dẫn" onClick={dismiss}>
        <X size={14} />
      </button>
      <p className="farm-fish-tutorial__title">Câu cá — {spotLabel}</p>
      <ol className="farm-fish-tutorial__steps">
        <li>
          Bấm <strong>Quăng cần</strong> — cảnh có người câu, phao và mặt nước pixel art (không phải lưới màu giả).
        </li>
        <li>Chờ phao tụt — bấm <strong>Gài móc!</strong> khi có cá.</li>
        <li>
          Minigame: chạm khi <strong>vạch vàng</strong> nằm trong <strong>vùng xanh</strong> để kéo cá.
        </li>
        <li>Tên cá và độ hiếm hiển thị bằng tiếng Việt khi lên cá hoặc tuột mất.</li>
      </ol>
    </div>
  );
}