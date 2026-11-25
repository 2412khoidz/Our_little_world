import { X } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { MapId } from '../../shared/types';

const STORAGE_KEY = 'olw_farm_fish_tutorial_v1';

interface FarmFishLoopTutorialProps {
  mapId: MapId;
  donorPlayable: boolean;
}

export function FarmFishLoopTutorial({ mapId, donorPlayable }: FarmFishLoopTutorialProps) {
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

  if (!donorPlayable || dismissed) return null;
  if (mapId !== 'farm' && mapId !== 'outdoor' && mapId !== 'village') return null;

  return (
    <div
      className="farm-fish-tutorial"
      data-testid="farm-fish-tutorial"
      role="region"
      aria-label="Hướng dẫn ruộng và câu cá"
    >
      <button type="button" className="farm-fish-tutorial__close" aria-label="Đóng" onClick={dismiss}>
        <X size={16} />
      </button>
      <p className="farm-fish-tutorial__title">Ruộng &amp; câu cá — bước nhanh</p>
      <ol className="farm-fish-tutorial__steps">
        <li>Thanh đồ (1–8): cuốc → tưới → hạt.</li>
        <li>Ruộng Cabacos: đứng sát luống, chọn cuốc, bấm <strong>J</strong> để cuốc / gieo / tưới / thu hoạch.</li>
        <li>Gian <strong>Bác Hai</strong> trên ruộng hoặc chợ: <strong>J</strong> mua hạt.</li>
        <li>Ao / suối ngoài trời: <strong>J</strong> cầu cá (không cần menu Dev).</li>
      </ol>
    </div>
  );
}