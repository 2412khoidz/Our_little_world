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
import type { DonorWorkshopFocus } from '../../shared/donor/donorWorkshopFocus';
import { NuvoraCraftDesk } from '../inventory/nuvora/NuvoraCraftDesk';
import '../inventory/nuvora/nuvoraInventorySkin.css';

interface DonorWorkshopModalProps {
  worldId: string;
  focusSection?: DonorWorkshopFocus;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
}

export function DonorWorkshopModal({ worldId, focusSection, onClose, onInventoryRefresh }: DonorWorkshopModalProps) {
  const showMill = !focusSection || focusSection === 'mill';
  const showBakery = !focusSection || focusSection === 'mill' || focusSection === 'bakery';
  const showCoop = !focusSection || focusSection === 'mill' || focusSection === 'coop';
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
    <div className="modal-backdrop nuvora-inv-backdrop" role="dialog" aria-modal="true" data-testid="donor-workshop-modal">
      <div className="nuvora-desk" style={{ maxWidth: 'min(98vw, 480px)' }}>
        <div className="nuvora-desk__title-row">
          <h2 className="nuvora-desk__title">
            <Factory size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {focusSection === 'bakery'
              ? 'Lò Hollow — làng'
              : focusSection === 'coop'
                ? 'Chuồng gà — làng'
                : 'Xưởng chế biến ruộng'}
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
        {showMill && (
          <NuvoraCraftDesk title="Cối xay Meadowbrook" plateLabel="CỐI XAY">
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void run(() => postDonorWorkshopQueue(worldId, 'olw_flour').then())}>
              Xếp: 2 lúa → bột
            </button>
            <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => void run(() => postDonorWorkshopCollect(worldId).then())}>
              Lấy từ cối xay
            </button>
            <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18, color: '#e8f0ff' }}>
              {(view?.mill.queue ?? []).map((job) => (
                <li key={`m-${job.recipeId}-${job.endMs}`}>{job.recipeId}</li>
              ))}
            </ul>
          </NuvoraCraftDesk>
        )}

        {showBakery && (
          <NuvoraCraftDesk title="Lò Hollow" plateLabel="LÒ NƯỚNG">
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} data-testid="donor-queue-bread" onClick={() => void run(() => postDonorBakeryQueue(worldId, 'olw_bread').then())}>
              Xếp: 1 bột → bánh mì
            </button>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void run(() => postDonorBakeryQueue(worldId, 'olw_chicken_feed').then())}>
              Xếp: 3 lúa → thức ăn gà ×6
            </button>
            <button type="button" className="btn btn--secondary btn--sm" disabled={busy} data-testid="donor-collect-bakery" onClick={() => void run(() => postDonorBakeryCollect(worldId).then())}>
              Lấy từ lò
            </button>
            <ul style={{ fontSize: 12, margin: 0, paddingLeft: 18, color: '#e8f0ff' }}>
              {(view?.bakery.queue ?? []).map((job) => (
                <li key={`b-${job.recipeId}-${job.endMs}`}>{job.recipeId}</li>
              ))}
            </ul>
          </NuvoraCraftDesk>
        )}

        {showCoop && (
          <NuvoraCraftDesk title="Chuồng gà" plateLabel="CHUỒNG">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="btn btn--secondary btn--sm" disabled={busy} data-testid="donor-coop-feed" onClick={() => void run(() => postDonorCoopFeed(worldId).then())}>
                Cho ăn (1 thức ăn gà)
              </button>
              <button type="button" className="btn btn--secondary btn--sm" disabled={busy} data-testid="donor-coop-collect" onClick={() => void run(() => postDonorCoopCollect(worldId).then())}>
                <Egg size={14} style={{ verticalAlign: 'middle' }} /> Nhặt trứng
              </button>
            </div>
          </NuvoraCraftDesk>
        )}
      </div>
    </div>
  );
}