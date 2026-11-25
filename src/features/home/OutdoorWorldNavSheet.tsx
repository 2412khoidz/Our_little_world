import { MapPin, Trees, Waves, X } from 'lucide-react';
import { isOutdoorMapUnlocked } from '../../shared/maps';
import { WORLD_AREA_NODES } from '../../shared/world/worldAreaGraph';
import type { MapId } from '../../shared/types';

const OUTDOOR_DESTINATIONS: { mapId: MapId; labelVi: string; testId: string }[] = [
  { mapId: 'village', labelVi: 'Làng Cabacos', testId: 'outdoor-nav-village' },
  { mapId: 'farm', labelVi: 'Trang trại', testId: 'outdoor-nav-farm' },
  { mapId: 'forest', labelVi: 'Rừng', testId: 'outdoor-nav-forest' },
  {
    mapId: 'beach',
    labelVi: WORLD_AREA_NODES.find((n) => n.id === 'beach')?.nameVi ?? 'Bãi biển (Gull Bay)',
    testId: 'outdoor-nav-beach',
  },
  { mapId: 'shop', labelVi: 'Cửa hàng làng', testId: 'outdoor-nav-shop' },
];

interface OutdoorWorldNavSheetProps {
  open: boolean;
  currentMapId: MapId;
  onClose: () => void;
  onSelectMap: (mapId: MapId) => void;
}

export function OutdoorWorldNavSheet({
  open,
  currentMapId,
  onClose,
  onSelectMap,
}: OutdoorWorldNavSheetProps) {
  if (!open || !isOutdoorMapUnlocked()) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Đi tới khu vực ngoài trời"
      data-testid="outdoor-world-nav-sheet"
    >
      <div className="modal-panel" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <h2 className="modal-title">Khám phá thế giới</h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '0 0 10px' }}>
          Chọn điểm đến — bãi biển Gull Bay nằm ở mép nam làng hoặc qua rừng (cùng chất lượng bản đồ Cabacos).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {OUTDOOR_DESTINATIONS.map((dest) => (
            <button
              key={dest.mapId}
              type="button"
              data-testid={dest.testId}
              className={`btn btn--secondary ${currentMapId === dest.mapId ? 'nav-btn--active' : ''}`}
              style={{ justifyContent: 'flex-start', gap: 10 }}
              onClick={() => {
                onSelectMap(dest.mapId);
                onClose();
              }}
            >
              {dest.mapId === 'beach' ? <Waves size={18} /> : dest.mapId === 'forest' ? <Trees size={18} /> : <MapPin size={18} />}
              {dest.labelVi}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}