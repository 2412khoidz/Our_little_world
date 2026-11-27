import { X, ClipboardCheck, Coins, Clock } from 'lucide-react';
import type { OrderBoardState } from '../../shared/economy/orderBoard';
import { getItem } from '../../shared/economy/catalogConfig';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import './deepFarmingModals.css';

export interface OrderBoardModalProps {
  open: boolean;
  onClose: () => void;
  nowMs: number;
  board: OrderBoardState | null;
  inventory: InventorySnapshot | null;
  walletCoins: number;
  busy: boolean;
  statusMessage?: string | null;
  onCompleteOrder: (orderId: string) => void;
}

export function OrderBoardModal({
  open,
  onClose,
  nowMs,
  board,
  inventory,
  walletCoins,
  busy,
  statusMessage,
  onCompleteOrder,
}: OrderBoardModalProps) {
  if (!open) return null;

  const sharedQty = (sku: string) =>
    (inventory?.items ?? [])
      .filter((r) => r.ownerScope === 'shared' && r.itemSku === sku)
      .reduce((sum, r) => sum + r.qty, 0);

  const remainingMs = board ? Math.max(0, board.expiresAtMs - nowMs) : 0;
  const remainingMin = Math.ceil(remainingMs / 60_000);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Bảng Đơn Hàng Làng"
      data-testid="order-board-modal"
      onClick={onClose}
    >
      <div
        className="olw-deep-dialog olw-deep-dialog--compact"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="olw-deep-header">
          <div className="olw-deep-header__title-group">
            <ClipboardCheck size={19} color="#7c5328" />
            <h2 className="olw-deep-title">Bảng Đơn Hàng Làng</h2>
          </div>
          <div className="olw-deep-header__actions">
            <span className="olw-deep-pill">
              <Clock size={13} />
              Làm mới sau {remainingMin} phút
            </span>
            <span className="olw-deep-pill olw-deep-pill--coins">{walletCoins} xu</span>
            <button type="button" onClick={onClose} aria-label="Đóng" className="olw-deep-close">
              <X size={18} />
            </button>
          </div>
        </div>

        {statusMessage ? <div className="olw-deep-status">{statusMessage}</div> : null}

        <div className="olw-deep-body">
          <p className="olw-deep-subtitle">
            Hoàn thành đơn hàng chung để nhận thưởng cao hơn giá thùng gom 35%–70%. Không hoàn thành
            kịp sẽ không bị phạt.
          </p>

          {(board?.orders ?? []).every((o) => o === null) ? (
            <div className="olw-deep-empty">
              Hiện chưa có đơn mới. Các đơn tiếp theo sẽ tự làm mới theo chu kỳ!
            </div>
          ) : (
            <div className="olw-deep-grid-3">
              {(board?.orders ?? []).map((order, idx) => {
                if (!order) {
                  return (
                    <div key={`done-${idx}`} className="olw-deep-card olw-deep-card--muted">
                      Đơn #{idx + 1} đã giao xong
                    </div>
                  );
                }
                const canFulfill = order.requirements.every(
                  (req) => sharedQty(req.sku) >= req.qty,
                );
                return (
                  <div key={order.orderId} className="olw-deep-card">
                    <div>
                      <div className="olw-deep-row-between" style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#6e5437' }}>
                          Đơn #{idx + 1}
                        </span>
                        <span className="olw-deep-badge olw-deep-badge--green">
                          ×{(order.multiplierBp / 10_000).toFixed(2)}
                        </span>
                      </div>
                      <ul className="olw-deep-req-list">
                        {order.requirements.map((req) => {
                          const have = sharedQty(req.sku);
                          const name = getItem(req.sku)?.nameVi ?? req.sku;
                          return (
                            <li key={req.sku} className="olw-deep-req-row">
                              <div className="olw-deep-row">
                                <CatalogSkuIcon sku={req.sku} size={18} />
                                <span
                                  style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {name}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: have >= req.qty ? '#3f7527' : '#b5473c',
                                }}
                              >
                                {have}/{req.qty}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <button
                      type="button"
                      disabled={busy || !canFulfill}
                      onClick={() => onCompleteOrder(order.orderId)}
                      className="olw-deep-btn olw-deep-btn--green olw-deep-btn--full"
                    >
                      <Coins size={14} />
                      Giao đơn · +{order.rewardCoins} xu
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
