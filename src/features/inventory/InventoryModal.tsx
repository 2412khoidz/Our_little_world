import { itemUsageDetails } from '../../shared/inventory/itemUsageDetails';
import { useCallback, useMemo, useState } from 'react';
import { Backpack, Gift, Sparkles, X } from 'lucide-react';
import { computeSellPriceBp, getItem } from '../../shared/economy/catalogConfig';
import { QUALITY_MULTIPLIER_BP } from '../../shared/economy/types';
import {
  canonicalFishItemDefinition,
  resolveCanonicalFishBySku,
} from '../../shared/donor/fishing/canonicalFishRegistry';
import {
  applyDirectSlotDrop,
  assignStackToHotbar,
  cancelInventoryCursor,
  clearHotbarBinding,
  splitBagSlotInPlace,
  type InventoryPickedCursor,
} from '../../shared/donor/nuvora/nuvoraSlotInteraction';
import { getCropDefinition } from '../../shared/farming/crops';
import { gameEventBus } from '../../game/eventBus';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import {
  bagPageSize,
  HOTBAR_CAPACITY,
  inventoryCellLimit,
  normalizeQuality,
  reconcileInventoryInteraction,
  sameStackRef,
  type InventoryBagCell,
  type InventoryLayoutState,
  type InventoryStackRef,
} from '../../shared/inventory/inventoryLayoutStore';
import type { HotbarSlot } from '../../shared/interaction/interactionTypes';
import type { ItemQualityTier } from '../../shared/interaction/hotbarContract';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import { NuvoraInteractiveTray, type InspectedSlotRef } from './nuvora/NuvoraInteractiveTray';
import './nuvora/nuvoraInventorySkin.css';

interface InventoryModalProps {
  snapshot: InventorySnapshot | null;
  layout: InventoryLayoutState;
  onChangeLayout: (next: InventoryLayoutState) => void;
  localUserId: string;
  hotbarSlots: readonly HotbarSlot[];
  heldHotbarIndex: number | null;
  loading: boolean;
  touchMode?: boolean;
  onClaimFreeKibble: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

const QUALITY_LABEL_VI: Record<ItemQualityTier, string> = {
  normal: 'Thường',
  silver: 'Bạc',
  gold: 'Vàng',
};

const GROUP_LABEL_VI: Record<string, string> = {
  fish: 'Cá câu được',
  seed: 'Hạt giống',
  grain: 'Ngũ cốc',
  veg: 'Rau củ',
  fruit: 'Trái cây',
  flower: 'Hoa',
  dish: 'Món chế biến',
  material: 'Nguyên liệu',
  pantry: 'Thực phẩm',
  bait: 'Mồi câu',
  craft: 'Thủ công',
  food: 'Đồ ăn bé mèo',
  toy: 'Đồ chơi',
  gift: 'Quà tặng',
  tool: 'Dụng cụ',
  water: 'Dụng cụ tưới / nước',
};

function resolveUnitSellCoins(sku: string, quality: ItemQualityTier): number | null {
  try {
    const def = getItem(sku);
    if (!def || def.sellPrice <= 0) return null;
    return Math.max(1, Math.floor(computeSellPriceBp(sku, quality) / 10_000));
  } catch {
    // fallback below
  }
  const fish = canonicalFishItemDefinition(sku);
  if (fish && fish.sellPrice > 0) {
    return Math.max(
      1,
      Math.floor((fish.sellPrice * QUALITY_MULTIPLIER_BP[quality]) / 10_000),
    );
  }
  return null;
}

export function InventoryModal({
  snapshot,
  layout: committedLayout,
  onChangeLayout: onCommitLayout,
  localUserId,
  hotbarSlots,
  heldHotbarIndex,
  loading,
  touchMode = false,
  onClaimFreeKibble,
  onRefresh,
  onClose,
}: InventoryModalProps) {
  const [tab, setTab] = useState<'shared' | 'personal'>('shared');
  const [inspectedRef, setInspectedRef] = useState<InspectedSlotRef | null>(null);
  const [pendingMove, setPendingMove] = useState<{ index: number; cell: InventoryBagCell } | null>(null);
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<{
    snapshot: InventorySnapshot | null;
    layout: InventoryLayoutState;
    cursor: InventoryPickedCursor | null;
  } | null>(null);

  const interaction = draft && draft.snapshot !== snapshot
    ? { snapshot, ...reconcileInventoryInteraction(draft.layout, draft.cursor, snapshot, localUserId) }
    : draft;
  if (interaction !== draft) setDraft(interaction);
  const { layout, cursor } = interaction ?? { layout: committedLayout, cursor: null };
  const activeBag = tab === 'shared' ? layout.sharedCells : layout.personalCells;
  const pendingCell = pendingMove ? activeBag[pendingMove.index] : null;
  const pendingMoveBagIndex = pendingMove && sameStackRef(pendingMove.cell, pendingCell)
    && pendingMove.cell.qty === pendingCell?.qty ? pendingMove.index : null;
  const pageSize = bagPageSize(tab);
  const pageCount = Math.ceil(activeBag.length / pageSize);

  function onChangeLayout(next: InventoryLayoutState, nextCursor = cursor) {
    const result = reconcileInventoryInteraction(next, nextCursor, snapshot, localUserId);
    if (result.cursor) {
      setDraft({ snapshot, ...result });
    } else {
      setDraft(null);
      onCommitLayout(result.layout);
    }
    return result;
  }

  function cancelCursor() {
    if (!interaction) return;
    const restored = cancelInventoryCursor(layout, cursor);
    onChangeLayout(restored.layout, null);
  }

  function switchTab(next: 'shared' | 'personal') {
    if (next === tab) return;
    cancelCursor();
    setTab(next);
    setPage(0);
    setInspectedRef(null);
    setPendingMove(null);
  }

  const catalogMap = useMemo(
    () => new Map((snapshot?.catalog ?? []).map((c) => [c.sku, c])),
    [snapshot?.catalog],
  );

  const labelForSku = useCallback(
    (sku: string) =>
      catalogMap.get(sku)?.nameVi ??
      getCropDefinition(sku)?.nameVi ??
      resolveCanonicalFishBySku(sku)?.labelVi ??
      getItem(sku)?.nameVi ??
      sku,
    [catalogMap],
  );

  const items = snapshot?.items ?? [];
  function stackLimitForStack(stack: InventoryStackRef) {
    const total = items.reduce((sum, row) => sum + (
      row.itemSku === stack.itemSku && row.ownerScope === stack.ownerScope
        && normalizeQuality(row.quality) === stack.quality ? row.qty : 0
    ), 0);
    return inventoryCellLimit(catalogMap.get(stack.itemSku)?.stackLimit, total, pageSize);
  }
  const catalogStackLimit = (sku: string) => catalogMap.get(sku)?.stackLimit ?? Infinity;
  const sharedItems = items.filter((i) => i.ownerScope === 'shared');
  const personalItems = items.filter((i) => i.ownerScope === `user:${localUserId}`);
  const shown = tab === 'shared' ? sharedItems : personalItems;
  const firstOnPage = page * pageSize;

  const sharedQty = sharedItems.reduce((sum, i) => sum + i.qty, 0);
  const personalQty = personalItems.reduce((sum, i) => sum + i.qty, 0);

  const resolvedInspect = useMemo((): {
    ref: InspectedSlotRef;
    stack: InventoryStackRef;
    qty: number;
    bagIndex: number | null;
    hotbarIndex: number | null;
  } | null => {
    const activeBag = tab === 'shared' ? layout.sharedCells : layout.personalCells;
    if (inspectedRef) {
      if (inspectedRef.kind === 'bag' && inspectedRef.scope === tab) {
        const cell: InventoryBagCell | null = activeBag[inspectedRef.index] ?? null;
        if (cell && cell.qty > 0) {
          const boundIdx = layout.hotbarBindings.findIndex((b) => sameStackRef(b, cell));
          return {
            ref: inspectedRef,
            stack: {
              itemSku: cell.itemSku,
              quality: cell.quality,
              ownerScope: cell.ownerScope,
            },
            qty: cell.qty,
            bagIndex: inspectedRef.index,
            hotbarIndex: boundIdx >= 0 ? boundIdx : null,
          };
        }
      } else if (inspectedRef.kind === 'hotbar') {
        const slot = hotbarSlots.find((s) => s.slotIndex === inspectedRef.index);
        const binding = layout.hotbarBindings[inspectedRef.index];
        if (slot?.itemSku && slot.qty > 0 && binding) {
          return {
            ref: inspectedRef,
            stack: binding,
            qty: slot.qty,
            bagIndex: null,
            hotbarIndex: inspectedRef.index,
          };
        }
      }
    }

    if (heldHotbarIndex !== null && heldHotbarIndex >= 0) {
      const slot = hotbarSlots.find((s) => s.slotIndex === heldHotbarIndex);
      const binding = layout.hotbarBindings[heldHotbarIndex];
      if (slot?.itemSku && slot.qty > 0 && binding) {
        return {
          ref: { kind: 'hotbar', scope: tab, index: heldHotbarIndex },
          stack: binding,
          qty: slot.qty,
          bagIndex: null,
          hotbarIndex: heldHotbarIndex,
        };
      }
    }

    const firstIdx = activeBag.findIndex((c, index) => index >= firstOnPage
      && index < firstOnPage + pageSize && c && c.qty > 0);
    if (firstIdx >= 0) {
      const cell = activeBag[firstIdx]!;
      const boundIdx = layout.hotbarBindings.findIndex((b) => sameStackRef(b, cell));
      return {
        ref: { kind: 'bag', scope: tab, index: firstIdx },
        stack: {
          itemSku: cell.itemSku,
          quality: cell.quality,
          ownerScope: cell.ownerScope,
        },
        qty: cell.qty,
        bagIndex: firstIdx,
        hotbarIndex: boundIdx >= 0 ? boundIdx : null,
      };
    }

    return null;
  }, [tab, layout, inspectedRef, hotbarSlots, heldHotbarIndex, firstOnPage, pageSize]);

  const inspectorDetails = useMemo(() => {
    if (!resolvedInspect) return null;
    const sku = resolvedInspect.stack.itemSku;
    const quality = resolvedInspect.stack.quality;
    const catalog = catalogMap.get(sku);
    const econ = getItem(sku);
    const groupKey = catalog?.purpose ?? econ?.group ?? (sku.startsWith('tool_') ? 'tool' : '');
    const categoryLabel = GROUP_LABEL_VI[groupKey] ?? 'Vật phẩm';
    const details = itemUsageDetails(sku, labelForSku(sku), catalog?.descriptionVi);
    const sellPrice = resolveUnitSellCoins(sku, quality);
    return {
      sku,
      nameVi: labelForSku(sku),
      quality,
      qualityVi: QUALITY_LABEL_VI[quality],
      categoryLabel,
      descriptionVi: details.descriptionVi,
      usageVi: details.usageVi,
      sellPrice,
      qty: resolvedInspect.qty,
      bagIndex: resolvedInspect.bagIndex,
      hotbarIndex: resolvedInspect.hotbarIndex,
    };
  }, [resolvedInspect, catalogMap, labelForSku]);

  return (
    <div className="modal-backdrop nuvora-inv-backdrop" role="dialog" aria-modal="true" aria-label="Túi đồ & Hạt mèo">
      <div className="nuvora-desk" data-testid="inventory-modal">
        <div className="nuvora-desk__title-row">
          <h2 className="nuvora-desk__title">
            <Backpack size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Túi đồ ngôi nhà
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => { cancelCursor(); onClose(); }} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'shared' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            data-testid="tab-inventory-shared"
            onClick={() => switchTab('shared')}
          >
            Túi chung ({sharedQty})
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'personal' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            data-testid="tab-inventory-personal"
            onClick={() => switchTab('personal')}
          >
            <Gift size={14} /> Ngăn riêng ({personalQty})
          </button>
        </div>

        {snapshot?.canClaimFreeKibble && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: '#f0e4c8',
              border: '2px solid #8a5a2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, color: '#4a3320' }}>
              <strong>Hạt mèo miễn phí hôm nay</strong>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
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

        {shown.length === 0 && (
          <div className="cozy-alert" style={{ fontSize: 12.5, background: '#f0e4c8', color: '#4a3320' }}>
            {tab === 'shared'
              ? 'Túi chung hiện đang trống. Bạn có thể nhận hạt mèo miễn phí phía trên.'
              : 'Ngăn riêng tư hiện chưa có món nào. Chỉ mình bạn mới xem được ngăn này để giấu quà bất ngờ!'}
          </div>
        )}

        <div className="nuvora-desk__body">
          <NuvoraInteractiveTray
            key={tab}
            scope={tab}
            page={page}
            cursor={cursor}
            stackLimitForStack={stackLimitForStack}
            catalogStackLimit={catalogStackLimit}
            layout={layout}
            onChangeLayout={onChangeLayout}
            hotbarSlots={hotbarSlots}
            heldHotbarIndex={heldHotbarIndex}
            labelForSku={labelForSku}
            inspectedRef={resolvedInspect?.ref ?? null}
            onInspect={setInspectedRef}
            plateLabel={tab === 'shared' ? 'TÚI CHUNG' : 'NGĂN RIÊNG'}
            touchMode={touchMode}
            pendingMoveBagIndex={pendingMoveBagIndex}
            onCompleteTouchMove={(destKind, destIndex) => {
              if (pendingMoveBagIndex === null) return;
              const res = applyDirectSlotDrop(
                layout,
                { kind: 'bag', scope: tab, index: pendingMoveBagIndex },
                { kind: destKind, scope: tab, index: destIndex },
                { labelForSku, heldHotbarIndex, stackLimitForStack },
              );
              onChangeLayout(res.layout);
              if (res.selectHotbarIndex !== undefined) {
                gameEventBus.emit('cmd:select-hotbar-slot', { slotIndex: res.selectHotbarIndex });
              }
              setPendingMove(null);
              setInspectedRef({ kind: destKind, scope: tab, index: destIndex });
            }}
          />
          {pageCount > 1 && (
            <nav className="nuvora-inventory-pages" aria-label="Trang túi đồ">
              <button type="button" className="btn btn--secondary btn--sm" disabled={page === 0}
                onClick={() => { setPage(page - 1); setInspectedRef(null); }}>
                Trang trước
              </button>
              <span aria-live="polite">Trang {page + 1} / {pageCount}</span>
              <button type="button" className="btn btn--secondary btn--sm" disabled={page + 1 >= pageCount}
                onClick={() => { setPage(page + 1); setInspectedRef(null); }}>
                Trang sau
              </button>
            </nav>
          )}

          {inspectorDetails && resolvedInspect && (
            <div className="nuvora-inspector" data-testid="inventory-inspector">
              <div className="nuvora-inspector__head">
                <div className="nuvora-inspector__icon">
                  <CatalogSkuIcon sku={inspectorDetails.sku} size={32} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#3e2313' }}>
                    {inspectorDetails.nameVi}
                  </div>
                  <div className="nuvora-inspector__meta">
                    <span className="nuvora-inspector__badge">{inspectorDetails.categoryLabel}</span>
                    {inspectorDetails.quality !== 'normal' && (
                      <span className="nuvora-inspector__badge">
                        Phẩm cấp: {inspectorDetails.qualityVi}
                      </span>
                    )}
                    <span className="nuvora-inspector__badge">Số lượng: {inspectorDetails.qty}</span>
                    {inspectorDetails.sellPrice !== null && (
                      <span className="nuvora-inspector__badge">
                        Bán: {inspectorDetails.sellPrice} xu/cái
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12.5, lineHeight: 1.4, color: '#4f2f1b' }}>
                {inspectorDetails.descriptionVi}
                {inspectorDetails.usageVi && inspectorDetails.usageVi !== inspectorDetails.descriptionVi && (
                  <span className="nuvora-inspector__usage">{inspectorDetails.usageVi}</span>
                )}
              </div>

              <div className="nuvora-inspector__hotbar-row">
                <span style={{ fontSize: 11.5, fontWeight: 700, marginRight: 2 }}>
                  Gán ô nhanh:
                </span>
                {Array.from({ length: HOTBAR_CAPACITY }, (_, slotIdx) => {
                  const isAssignedHere = inspectorDetails.hotbarIndex === slotIdx;
                  return (
                    <button
                      key={slotIdx}
                      type="button"
                      className={`nuvora-hotbar-num-btn ${isAssignedHere ? 'nuvora-hotbar-num-btn--active' : ''}`}
                      data-testid={`btn-assign-hotbar-${slotIdx + 1}`}
                      onClick={() => {
                        setPendingMove(null);
                        const res = assignStackToHotbar(layout, resolvedInspect.stack, slotIdx);
                        onChangeLayout(res.layout);
                        gameEventBus.emit('cmd:select-hotbar-slot', { slotIndex: res.slotIndex });
                        setInspectedRef({ kind: 'hotbar', scope: tab, index: res.slotIndex });
                      }}
                    >
                      {slotIdx + 1}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  data-testid="btn-equip-inspected-item"
                  onClick={() => {
                    setPendingMove(null);
                    const preferred =
                      inspectorDetails.hotbarIndex !== null
                        ? inspectorDetails.hotbarIndex
                        : heldHotbarIndex !== null && heldHotbarIndex >= 0
                          ? heldHotbarIndex
                          : undefined;
                    const restored = cancelInventoryCursor(layout, cursor);
                    const res = assignStackToHotbar(restored.layout, resolvedInspect.stack, preferred);
                    onChangeLayout(res.layout, null);
                    gameEventBus.emit('cmd:select-hotbar-slot', { slotIndex: res.slotIndex });
                    onClose();
                  }}
                >
                  Cầm ngay
                </button>
                {inspectorDetails.bagIndex !== null && (
                  <button
                    type="button"
                    className={`btn btn--sm ${pendingMoveBagIndex === inspectorDetails.bagIndex ? 'btn--primary' : 'btn--secondary'}`}
                    data-testid="btn-touch-move-slot"
                    onClick={() => {
                      const index = inspectorDetails.bagIndex!;
                      const cell = activeBag[index];
                      setPendingMove(cell && pendingMoveBagIndex !== index ? { index, cell } : null);
                    }}
                  >
                    {pendingMoveBagIndex === inspectorDetails.bagIndex ? 'Chạm ô đích…' : 'Đổi ô'}
                  </button>
                )}
                {inspectorDetails.bagIndex !== null && inspectorDetails.qty >= 2 && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    data-testid="btn-split-stack"
                    onClick={() => {
                      setPendingMove(null);
                      const next = splitBagSlotInPlace(layout, tab, inspectorDetails.bagIndex!);
                      const after = tab === 'shared' ? next.sharedCells : next.personalCells;
                      const added = after.findIndex((cell, index) => cell && !activeBag[index]);
                      onChangeLayout(next);
                      if (added >= 0 && Math.floor(added / pageSize) !== page) {
                        setPage(Math.floor(added / pageSize));
                        setInspectedRef({ kind: 'bag', scope: tab, index: added });
                      }
                    }}
                  >
                    Tách đôi
                  </button>
                )}
                {inspectorDetails.hotbarIndex !== null && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    data-testid="btn-unbind-hotbar"
                    onClick={() => {
                      const next = clearHotbarBinding(layout, inspectorDetails.hotbarIndex!);
                      onChangeLayout(next);
                    }}
                  >
                    Gỡ ô nhanh
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: '#462818', opacity: 0.85 }}>
            {touchMode
              ? 'Chạm ô để chọn · Bấm "Cầm ngay" hoặc 1–8 để đưa lên thanh nhanh · Bấm "Đổi ô" hoặc kéo để sắp xếp'
              : 'Click hoặc kéo thả để đổi vị trí · Chuột phải tách đôi / đặt 1 món · Shift+click gán thanh nhanh'}
          </span>
          <button type="button" className="btn btn--secondary btn--sm" disabled={loading} onClick={() => void onRefresh()}>
            Làm mới túi đồ
          </button>
        </div>
      </div>
    </div>
  );
}