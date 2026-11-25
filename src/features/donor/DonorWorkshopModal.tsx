import { useCallback, useEffect, useState } from 'react';
import { Egg, Factory, X } from 'lucide-react';
import {
  fetchDonorWorkshop,
  postDonorBakeryCollect,
  postDonorBakeryQueue,
  postDonorCoopCollect,
  postDonorCoopFeed,
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

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
      await onInventoryRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="donor-workshop-modal">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            <Factory size={18} /> Donor chế biến (C1+)
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        {error && (
          <div className="cozy-alert" style={{ fontSize: 13 }}>
            {error}
          </div>
        )}
        <p style={{ fontSize: 13, fontWeight: 600 }}>Cối xay Meadowbrook</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void run(() => postDonorWorkshopQueue(worldId, 'olw_flour').then())}>
            Xếp: 2 lúa → bột
          </button>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => void run(() => postDonorWorkshopCollect(worldId).then())}>
            Lấy từ cối xay
          </button>
        </div>
        <ul style={{ fontSize: 12 }}>
          {(view?.mill.queue ?? []).map((job) => (
            <li key={`m-${job.recipeId}-${job.endMs}`}>{job.recipeId}</li>
          ))}
        </ul>

        <p style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>Lò Hollow (harvest-hollow)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" className="btn btn--primary btn--sm" disabled={busy} data-testid="donor-queue-bread" onClick={() => void run(() => postDonorBakeryQueue(worldId, 'olw_bread').then())}>
            Xếp: 1 bột → bánh mì
          </button>
          <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void run(() => postDonorBakeryQueue(worldId, 'olw_chicken_feed').then())}>
            Xếp: 3 lúa → thức ăn gà ×6
          </button>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} data-testid="donor-collect-bakery" onClick={() => void run(() => postDonorBakeryCollect(worldId).then())}>
            Lấy từ lò
          </button>
        </div>
        <ul style={{ fontSize: 12 }}>
          {(view?.bakery.queue ?? []).map((job) => (
            <li key={`b-${job.recipeId}-${job.endMs}`}>{job.recipeId}</li>
          ))}
        </ul>

        <p style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>
          <Egg size={14} style={{ verticalAlign: 'middle' }} /> Chuồng gà
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} data-testid="donor-coop-feed" onClick={() => void run(() => postDonorCoopFeed(worldId).then())}>
            Cho ăn (1 thức ăn gà)
          </button>
          <button type="button" className="btn btn--secondary btn--sm" disabled={busy} data-testid="donor-coop-collect" onClick={() => void run(() => postDonorCoopCollect(worldId).then())}>
            Nhặt trứng
          </button>
        </div>
      </div>
    </div>
  );
}