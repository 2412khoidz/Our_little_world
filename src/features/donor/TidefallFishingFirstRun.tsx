import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'olw_tidefall_fishing_tutorial_v2';

interface TidefallFishingFirstRunProps {
  spotLabel: string;
}

/** Compact visual cue strip — zero wall of text. */
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
    <div
      data-testid="tidefall-fishing-first-run"
      role="note"
      aria-label={`Mẹo nhanh câu cá tại ${spotLabel}`}
      className="cozy-fishing-cue-strip"
    >
      <div className="cozy-fishing-cue-pills">
        <span className="cozy-fishing-cue-pill">🎣 Quăng cần</span>
        <span aria-hidden>→</span>
        <span className="cozy-fishing-cue-pill">❗ Phao tụt: Chạm!</span>
        <span aria-hidden>→</span>
        <span className="cozy-fishing-cue-pill">🎯 Chạm trong vùng xanh</span>
      </div>
      <button
        type="button"
        className="cozy-fishing-cue-close"
        aria-label="Đóng hướng dẫn"
        onClick={dismiss}
      >
        <X size={13} />
      </button>
    </div>
  );
}
