import { useState } from 'react';
import { Backpack, Gift, Sparkles, X } from 'lucide-react';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';

interface InventoryModalProps {
  snapshot: InventorySnapshot | null;
  localUserId: string;
  loading: boolean;
  onClaimFreeKibble: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

export function InventoryModal({
  snapshot,
  localUserId,
  loading,
  onClaimFreeKibble,
  onRefresh,
  onClose,
}: InventoryModalProps) {
  const [tab, setTab] = useState<'shared' | 'personal'>('shared');

  const catalogMap = new Map((snapshot?.catalog ?? []).map((c) => [c.sku, c]));
  const items = snapshot?.items ?? [];
  const sharedItems = items.filter((i) => i.ownerScope === 'shared');
  const personalItems = items.filter((i) => i.ownerScope === `user:${localUserId}`);
  const shown = tab === 'shared' ? sharedItems : personalItems;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Túi đồ & Hạt mèo">
      <div className="modal-panel" data-testid="inventory-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            <Backpack size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Túi đồ ngôi nhà
          </h2>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'shared' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            data-testid="tab-inventory-shared"
            onClick={() => setTab('shared')}
          >
            Túi chung ({sharedItems.reduce((sum, i) => sum + i.qty, 0)})
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'personal' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            data-testid="tab-inventory-personal"
            onClick={() => setTab('personal')}
          >
            <Gift size={14} /> Ngăn riêng ({personalItems.reduce((sum, i) => sum + i.qty, 0)})
          </button>
        </div>

        {snapshot?.canClaimFreeKibble && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: 'var(--surface-warm)',
              border: '1px solid var(--border-honey)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13 }}>
              <strong>Hạt mèo miễn phí hôm nay</strong>
              <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                Nhận 3 phần hạt cơ bản (0₫) cho bé mèo cam khi bát đang trống.
              </div>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={loading}
              data-testid="btn-claim-free-kibble"
              onClick={() => void onClaimFreeKibble()}
            >
              <Sparkles size={14} /> Nhận hạt
            </button>
          </div>
        )}

        {shown.length === 0 ? (
          <div className="cozy-alert" style={{ fontSize: 13 }}>
            {tab === 'shared'
              ? 'Túi chung hiện đang trống. Bạn có thể nhận hạt mèo miễn phí phía trên.'
              : 'Ngăn riêng tư hiện chưa có món nào. Chỉ mình bạn mới xem được ngăn này để giấu quà bất ngờ!'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shown.map((entry) => {
              const info = catalogMap.get(entry.itemSku);
              return (
                <div
                  key={`${entry.ownerScope}-${entry.itemSku}`}
                  data-testid={`inv-row-${entry.itemSku}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'var(--surface-warm)',
                    border: '1px solid var(--border-honey)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {info?.nameVi ?? entry.itemSku}
                    </div>
                    {info?.descriptionVi && (
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {info.descriptionVi}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      padding: '4px 10px',
                      borderRadius: 99,
                      background: 'rgba(217, 119, 98, 0.16)',
                    }}
                  >
                    ×{entry.qty}/{info?.stackLimit ?? 99}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={loading}
            onClick={() => void onRefresh()}
          >
            Làm mới túi đồ
          </button>
        </div>
      </div>
    </div>
  );
}
