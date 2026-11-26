import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Egg, Factory, Flame, Wheat, X } from 'lucide-react';
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
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import '../inventory/nuvora/nuvoraInventorySkin.css';

interface DonorWorkshopModalProps {
  worldId: string;
  focusSection?: DonorWorkshopFocus;
  inventory?: InventorySnapshot | null;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
}

interface RecipeCardDef {
  recipeId: string;
  titleVi: string;
  inputSku: string;
  inputLabelVi: string;
  inputQty: number;
  outputSku: string;
  outputLabelVi: string;
  outputQty: number;
  craftSec: number;
  actionLabelVi: string;
  testId?: string;
}

const MILL_RECIPES: readonly RecipeCardDef[] = [
  {
    recipeId: 'olw_flour',
    titleVi: 'Bột mì mịn',
    inputSku: 'wheat',
    inputLabelVi: 'Lúa mì',
    inputQty: 2,
    outputSku: 'flour',
    outputLabelVi: 'Bột mì',
    outputQty: 1,
    craftSec: 45,
    actionLabelVi: 'Xay bột',
  },
];

const BAKERY_RECIPES: readonly RecipeCardDef[] = [
  {
    recipeId: 'olw_bread',
    titleVi: 'Bánh mì ấm giòn',
    inputSku: 'flour',
    inputLabelVi: 'Bột mì',
    inputQty: 1,
    outputSku: 'donor_bread',
    outputLabelVi: 'Bánh mì',
    outputQty: 1,
    craftSec: 40,
    actionLabelVi: 'Nướng',
    testId: 'donor-queue-bread',
  },
  {
    recipeId: 'olw_chicken_feed',
    titleVi: 'Cám gà thơm',
    inputSku: 'wheat',
    inputLabelVi: 'Lúa mì',
    inputQty: 3,
    outputSku: 'chicken_feed',
    outputLabelVi: 'Thức ăn gà',
    outputQty: 6,
    craftSec: 25,
    actionLabelVi: 'Trộn cám',
  },
];

const ALL_RECIPES_MAP = new Map<string, RecipeCardDef>(
  [...MILL_RECIPES, ...BAKERY_RECIPES].map((r) => [r.recipeId, r]),
);

function sharedStock(inventory: InventorySnapshot | null | undefined, sku: string): number {
  if (!inventory) return 0;
  return inventory.items
    .filter((row) => row.ownerScope === 'shared' && row.itemSku === sku)
    .reduce((sum, row) => sum + row.qty, 0);
}

function formatRemainingSec(msLeft: number): string {
  const sec = Math.max(0, Math.ceil(msLeft / 1000));
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}p ${s}s`;
  }
  return `${sec}s`;
}

function RecipeRow({
  recipe,
  inventory,
  busy,
  onQueue,
}: {
  recipe: RecipeCardDef;
  inventory?: InventorySnapshot | null;
  busy: boolean;
  onQueue: () => void;
}) {
  const stock = inventory ? sharedStock(inventory, recipe.inputSku) : null;
  const hasEnough = stock === null ? true : stock >= recipe.inputQty;
  return (
    <div className="cozy-workshop-recipe">
      <div className="cozy-workshop-recipe__flow">
        <span className="cozy-workshop-slot" title={recipe.inputLabelVi}>
          <CatalogSkuIcon sku={recipe.inputSku} size={26} />
          <b>×{recipe.inputQty}</b>
        </span>
        <ArrowRight size={15} className="cozy-workshop-arrow" />
        <span className="cozy-workshop-slot cozy-workshop-slot--out" title={recipe.outputLabelVi}>
          <CatalogSkuIcon sku={recipe.outputSku} size={26} />
          <b>×{recipe.outputQty}</b>
        </span>
        <div className="cozy-workshop-recipe__meta">
          <strong>{recipe.titleVi}</strong>
          <small>
            {stock !== null ? (
              <span className={hasEnough ? 'cozy-badge cozy-badge--ok' : 'cozy-badge cozy-badge--warn'}>
                {hasEnough ? `Sẵn sàng (${stock}/${recipe.inputQty})` : `Thiếu (${stock}/${recipe.inputQty})`}
              </span>
            ) : (
              <span className="cozy-badge cozy-badge--muted">{recipe.craftSec}s</span>
            )}
          </small>
        </div>
      </div>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={busy || !hasEnough}
        data-testid={recipe.testId}
        onClick={onQueue}
      >
        {recipe.actionLabelVi}
      </button>
    </div>
  );
}

function QueueList({
  queue,
  nowMs,
  busy,
  collectLabelVi,
  collectTestId,
  onCollect,
}: {
  queue: readonly { recipeId: string; endMs: number }[];
  nowMs: number;
  busy: boolean;
  collectLabelVi: string;
  collectTestId?: string;
  onCollect: () => void;
}) {
  const readyCount = queue.filter((j) => j.endMs <= nowMs).length;
  return (
    <div className="cozy-workshop-queue">
      {queue.length === 0 ? (
        <div className="cozy-workshop-empty">Chưa có mẻ nào đang chạy — chọn công thức phía trên nhé.</div>
      ) : (
        <div className="cozy-workshop-queue-items">
          {queue.map((job, idx) => {
            const meta = ALL_RECIPES_MAP.get(job.recipeId);
            const leftMs = Math.max(0, job.endMs - nowMs);
            const ready = leftMs <= 0;
            const totalMs = (meta?.craftSec ?? 35) * 1000;
            const pct = ready ? 100 : Math.min(96, Math.max(8, Math.round((1 - leftMs / totalMs) * 100)));
            return (
              <div key={`${job.recipeId}-${job.endMs}-${idx}`} className="cozy-workshop-job">
                <CatalogSkuIcon sku={meta?.outputSku ?? 'flour'} size={24} />
                <div className="cozy-workshop-job__info">
                  <div className="cozy-workshop-job__top">
                    <span>{meta?.titleVi ?? 'Thành phẩm'}</span>
                    <span className={ready ? 'cozy-badge cozy-badge--ok' : 'cozy-badge cozy-badge--warm'}>
                      {ready ? 'Hoàn tất!' : `Đang làm · ${formatRemainingSec(leftMs)}`}
                    </span>
                  </div>
                  <div className="cozy-progress-track">
                    <div
                      className={`cozy-progress-fill ${ready ? 'cozy-progress-fill--done' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="cozy-workshop-collect-row">
        <button
          type="button"
          className={`btn btn--sm ${readyCount > 0 ? 'btn--primary' : 'btn--secondary'}`}
          disabled={busy}
          data-testid={collectTestId}
          onClick={onCollect}
        >
          <CheckCircle2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
          {collectLabelVi}
          {readyCount > 0 ? ` (${readyCount})` : ''}
        </button>
      </div>
    </div>
  );
}

export function DonorWorkshopModal({
  worldId,
  focusSection,
  inventory,
  onClose,
  onInventoryRefresh,
}: DonorWorkshopModalProps) {
  const showMill = !focusSection || focusSection === 'mill';
  const showBakery = !focusSection || focusSection === 'mill' || focusSection === 'bakery';
  const showCoop = !focusSection || focusSection === 'mill' || focusSection === 'coop';
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchDonorWorkshop>> | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [nowTickMs, setNowTickMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyView = useCallback((data: Awaited<ReturnType<typeof fetchDonorWorkshop>>) => {
    setView(data);
    setClockOffsetMs(data.nowMs - Date.now());
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchDonorWorkshop(worldId);
    applyView(data);
  }, [worldId, applyView]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchDonorWorkshop(worldId);
        if (!cancelled) applyView(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Không tải được dữ liệu xưởng.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [worldId, applyView]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTickMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const serverNow = nowTickMs + clockOffsetMs;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
      await onInventoryRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa thể thực hiện — kiểm tra nguyên liệu rồi thử lại nhé.');
    } finally {
      setBusy(false);
    }
  };

  const coop = view?.coop;
  const coopFed = Boolean(coop?.fedAtMs);
  const coopReady = Boolean(coop?.readyAtMs && serverNow >= coop.readyAtMs);
  const coopLeftMs = coop?.readyAtMs ? Math.max(0, coop.readyAtMs - serverNow) : 0;
  const feedStock = sharedStock(inventory, 'chicken_feed');
  const eggStock = sharedStock(inventory, 'donor_egg');

  return (
    <div className="modal-backdrop nuvora-inv-backdrop" role="dialog" aria-modal="true" data-testid="donor-workshop-modal">
      <div className="nuvora-desk" style={{ maxWidth: 'min(98vw, 500px)' }}>
        <div className="nuvora-desk__title-row">
          <h2 className="nuvora-desk__title">
            <Factory size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {focusSection === 'bakery'
              ? 'Lò bánh Hollow'
              : focusSection === 'coop'
                ? 'Chuồng gà Hollow'
                : 'Xưởng chế biến & Chuồng gà'}
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
          <section className="cozy-workshop-section" aria-label="Cối xay lúa">
            <div className="cozy-workshop-section__head">
              <span><Wheat size={15} /> Cối xay bột</span>
              <span className="cozy-workshop-pill">CỐI XAY</span>
            </div>
            {MILL_RECIPES.map((recipe) => (
              <RecipeRow
                key={recipe.recipeId}
                recipe={recipe}
                inventory={inventory}
                busy={busy}
                onQueue={() => void run(() => postDonorWorkshopQueue(worldId, recipe.recipeId).then())}
              />
            ))}
            <QueueList
              queue={view?.mill.queue ?? []}
              nowMs={serverNow}
              busy={busy}
              collectLabelVi="Nhận từ cối xay"
              onCollect={() => void run(() => postDonorWorkshopCollect(worldId).then())}
            />
          </section>
        )}

        {showBakery && (
          <section className="cozy-workshop-section" aria-label="Lò nướng bánh">
            <div className="cozy-workshop-section__head">
              <span><Flame size={15} /> Lò bánh Hollow</span>
              <span className="cozy-workshop-pill">LÒ NƯỚNG</span>
            </div>
            {BAKERY_RECIPES.map((recipe) => (
              <RecipeRow
                key={recipe.recipeId}
                recipe={recipe}
                inventory={inventory}
                busy={busy}
                onQueue={() => void run(() => postDonorBakeryQueue(worldId, recipe.recipeId).then())}
              />
            ))}
            <QueueList
              queue={view?.bakery.queue ?? []}
              nowMs={serverNow}
              busy={busy}
              collectLabelVi="Nhận thành phẩm"
              collectTestId="donor-collect-bakery"
              onCollect={() => void run(() => postDonorBakeryCollect(worldId).then())}
            />
          </section>
        )}

        {showCoop && (
          <section className="cozy-workshop-section" aria-label="Chuồng gà">
            <div className="cozy-workshop-section__head">
              <span><Egg size={15} /> Chuồng gà ấm áp</span>
              <span
                className={`cozy-badge ${
                  coopReady
                    ? 'cozy-badge--ok'
                    : coopFed
                      ? 'cozy-badge--warm'
                      : 'cozy-badge--warn'
                }`}
              >
                {coopReady
                  ? 'Có trứng sẵn sàng!'
                  : coopFed
                    ? `Đang đẻ trứng · còn ${formatRemainingSec(coopLeftMs)}`
                    : 'Chờ cho ăn'}
              </span>
            </div>

            <div className="cozy-coop-grid">
              <div className="cozy-coop-stat">
                <CatalogSkuIcon sku="chicken_feed" size={28} />
                <div>
                  <strong>Cám gà trong túi</strong>
                  <small>Có: {feedStock} phần</small>
                </div>
              </div>
              <div className="cozy-coop-stat">
                <CatalogSkuIcon sku="donor_egg" size={28} />
                <div>
                  <strong>Trứng trong túi</strong>
                  <small>Có: {eggStock} quả</small>
                </div>
              </div>
            </div>

            {coopFed && !coopReady && (
              <div className="cozy-coop-wait">
                <Clock size={14} /> Gà đang ấp ổ — xong sau {formatRemainingSec(coopLeftMs)}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className={`btn btn--sm ${!coopFed ? 'btn--primary' : 'btn--secondary'}`}
                disabled={busy}
                data-testid="donor-coop-feed"
                onClick={() => void run(() => postDonorCoopFeed(worldId).then())}
              >
                <CatalogSkuIcon sku="chicken_feed" size={16} />
                <span style={{ marginLeft: 5 }}>Cho gà ăn (1 cám)</span>
              </button>
              <button
                type="button"
                className={`btn btn--sm ${coopReady ? 'btn--primary' : 'btn--secondary'}`}
                disabled={busy || !coopReady}
                data-testid="donor-coop-collect"
                onClick={() => void run(() => postDonorCoopCollect(worldId).then())}
              >
                <CatalogSkuIcon sku="donor_egg" size={16} />
                <span style={{ marginLeft: 5 }}>Nhặt trứng</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
