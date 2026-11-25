import { useCallback, useEffect, useState } from 'react';
import { Factory, X } from 'lucide-react';
import {
  fetchDonorWorkshop,
  postDonorWorkshopCollect,
  postDonorWorkshopQueue,
} from '../../lib/backend/donorDevLanClient';

interface DonorWorkshopModalProps {
  worldId: string;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
}

export function DonorWorkshopModal({ worldId, onClose, onInventoryRefresh }: DonorWorkshopModalProps) {
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchDonorWorkshop>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchDonorWorkshop(worldId);
    setView(data);
  }, [worldId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchDonorWorkshop(worldId);
        if (!cancelled) setView(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được xưởng');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [worldId]);

  const queueRecipe = async (recipeId: string) => {
    setBusy(true);
    setError(null);
    try {
      await postDonorWorkshopQueue(worldId, recipeId);
      await refresh();
      await onInventoryRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xếp hàng thất bại');
    } finally {
      setBusy(false);
    }
  };

  const collect = async () => {
    setBusy(true);
    setError(null);
    try {
      await postDonorWorkshopCollect(worldId);
      await refresh();
      await onInventoryRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thu hoạch thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="donor-workshop-modal">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            <Factory size={18} /> Cối xay (Meadowbrook)
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          Hàng đợi chế biến vendored từ webfarmville@c420bc2 — trừ nguyên liệu túi chung, không sổ cái riêng.
        </p>
        {error && (
          <div className="cozy-alert" style={{ fontSize: 13 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void queueRecipe('olw_flour')}>
            Xếp: 2 lúa mì → 1 bột (45s)
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy}
            onClick={() => void queueRecipe('olw_strawberry_jam')}
          >
            Xếp: mứt dâu (45s)
          </button>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => void collect()}>
            Lấy món đã xong
          </button>
        </div>
        <ul style={{ fontSize: 12, marginTop: 12 }}>
          {(view?.queue ?? []).map((job) => (
            <li key={`${job.recipeId}-${job.endMs}`}>
              {job.recipeId} — xong lúc {new Date(job.endMs).toLocaleTimeString('vi-VN')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}