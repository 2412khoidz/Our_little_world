import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpCircle, CheckCircle2, Clock, Egg, Factory, Flame, Trash2, Wheat, X } from 'lucide-react';
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
import { getItem } from '../../shared/economy/catalogConfig';
import type { InventoryEntry, InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import {
  WORKSHOP_DEFS,
  recipesForWorkshop,
  workshopCapacitySlots,
  type WorkshopId,
  type WorkshopsWorldState,
} from '../../shared/farming/workshops';
import { getWorkshopMachineSprite, spriteBackgroundStyle } from '../../shared/art/farmingSpriteAtlas';
import { machineAtlasFrame, machineJobProgress, machinePhase, RANCH_ACTIONS_SIZE, RANCH_ACTIONS_URL } from '../../shared/art/ranchActionAtlas';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import '../inventory/nuvora/nuvoraInventorySkin.css';
import './ranchWorkshop.css';

interface DonorWorkshopModalProps {
  worldId: string;
  focusSection?: DonorWorkshopFocus;
  inventory?: InventorySnapshot | null;
  legacyVillageEnabled?: boolean;
  onClose: () => void;
  onInventoryRefresh: () => Promise<void>;
  /** Optional Deep Farming Checkpoint E bindings (8 collaborative workshops). */
  nowMs?: number;
  walletCoins?: number;
  inventoryItems?: readonly InventoryEntry[];
  workshopsState?: WorkshopsWorldState | null;
  onQueueDeepRecipe?: (workshopId: WorkshopId, recipeId: string) => Promise<void>;
  onCollectDeepWorkshop?: (workshopId: WorkshopId) => Promise<void>;
  onCancelDeepJob?: (workshopId: WorkshopId, jobId: string) => Promise<void>;
  onUpgradeDeepWorkshop?: (workshopId: WorkshopId) => Promise<void>;
}

function initialWorkshopForFocus(focus?: DonorWorkshopFocus): WorkshopId {
  if (focus === 'bakery') return 'bakery';
  return 'mill';
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
  legacyVillageEnabled,
  onClose,
  onInventoryRefresh,
  nowMs,
  walletCoins = 0,
  inventoryItems = [],
  workshopsState,
  onQueueDeepRecipe,
  onCollectDeepWorkshop,
  onCancelDeepJob,
  onUpgradeDeepWorkshop,
}: DonorWorkshopModalProps) {
  const deepAvailable = Boolean(workshopsState && onQueueDeepRecipe);
  const deepMode = deepAvailable && (!focusSection || focusSection === 'mill');
  const legacyVillageAvailable = !deepMode || Boolean(legacyVillageEnabled);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopId>(() =>
    initialWorkshopForFocus(focusSection),
  );
  const showMill = !deepMode && (!focusSection || focusSection === 'mill');
  const showBakery = legacyVillageAvailable && (!focusSection || focusSection === 'mill' || focusSection === 'bakery');
  const showCoop = legacyVillageAvailable && (!focusSection || focusSection === 'mill' || focusSection === 'coop');
  const [view, setView] = useState<Awaited<ReturnType<typeof fetchDonorWorkshop>> | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [nowTickMs, setNowTickMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sharedQty = useMemo(() => {
    const map = new Map<string, number>();
    const rows: readonly InventoryEntry[] =
      inventoryItems.length > 0 ? inventoryItems : (inventory?.items ?? []);
    for (const item of rows) {
      if (item.ownerScope !== 'shared') continue;
      map.set(item.itemSku, (map.get(item.itemSku) ?? 0) + item.qty);
    }
    return map;
  }, [inventory?.items, inventoryItems]);

  const applyView = useCallback((data: Awaited<ReturnType<typeof fetchDonorWorkshop>>) => {
    setView(data);
    setClockOffsetMs(data.nowMs - Date.now());
  }, []);

  const refresh = useCallback(async () => {
    if (!legacyVillageAvailable) return;
    const data = await fetchDonorWorkshop(worldId);
    applyView(data);
  }, [worldId, applyView, legacyVillageAvailable]);

  useEffect(() => {
    if (!legacyVillageAvailable) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchDonorWorkshop(worldId);
        if (!cancelled) applyView(data);
      } catch (e) {
        if (!cancelled && !deepMode) {
          setError(e instanceof Error ? e.message : 'Không tải được dữ liệu xưởng.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [worldId, applyView, deepMode, legacyVillageAvailable]);

  const needsLocalClock = nowMs === undefined || legacyVillageAvailable;
  useEffect(() => {
    if (!needsLocalClock) return;
    const id = window.setInterval(() => setNowTickMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [needsLocalClock]);

  const serverNow = nowMs ?? (nowTickMs + clockOffsetMs);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (legacyVillageAvailable) {
        await refresh().catch(() => {});
      }
      await onInventoryRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa thể thực hiện — kiểm tra nguyên liệu rồi thử lại nhé.');
    } finally {
      setBusy(false);
    }
  };

  const activeDef = WORKSHOP_DEFS.find((w) => w.id === selectedWorkshop) ?? WORKSHOP_DEFS[0]!;
  const activeStation = workshopsState?.stations[selectedWorkshop];
  const phase = machinePhase(activeStation?.queue ?? [], serverNow);
  const previewFrame = machineAtlasFrame(selectedWorkshop, phase);
  const previewScale = 2;
  const previewStatus = { idle: 'Đang nghỉ', working: 'Đang chế biến', ready: 'Có thành phẩm' }[phase];
  const activeRecipes = useMemo(() => recipesForWorkshop(selectedWorkshop), [selectedWorkshop]);

  const coop = view?.coop;
  const coopFed = Boolean(coop?.fedAtMs);
  const coopReady = Boolean(coop?.readyAtMs && serverNow >= coop.readyAtMs);
  const coopLeftMs = coop?.readyAtMs ? Math.max(0, coop.readyAtMs - serverNow) : 0;
  const feedStock = sharedStock(inventory, 'chicken_feed');
  const eggStock = sharedStock(inventory, 'donor_egg');

  return (
    <div className="modal-backdrop nuvora-inv-backdrop" role="dialog" aria-modal="true" data-testid="donor-workshop-modal">
      <div
        className="nuvora-desk"
        style={{
          maxWidth: deepMode ? 'min(98vw, 720px)' : 'min(98vw, 500px)',
          width: '100%',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        <div className="nuvora-desk__title-row">
          <h2 className="nuvora-desk__title">
            <Factory size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {deepMode
              ? 'Xưởng Chế Biến Hợp Tác'
              : focusSection === 'bakery'
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

        {deepMode && activeStation ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WORKSHOP_DEFS.map((ws) => {
                const wsSprite = getWorkshopMachineSprite(ws.id);
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => setSelectedWorkshop(ws.id)}
                    className={`btn btn--sm ranch-workshop__tab ${ws.id === selectedWorkshop ? 'btn--primary' : 'btn--secondary'}`}
                    aria-pressed={ws.id === selectedWorkshop}
                  >
                    {wsSprite ? (
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          flexShrink: 0,
                          ...spriteBackgroundStyle(wsSprite, 18),
                        }}
                      />
                    ) : null}
                    {ws.nameVi}
                  </button>
                );
              })}
            </div>

            <div
              className="ranch-workshop__station"
              data-machine-state={phase}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 10,
                background: '#f1e0be',
                color: '#503721',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ranch-workshop__machine-stage" aria-hidden="true">
                  <span
                    className="ranch-workshop__machine"
                    data-workshop-sprite={selectedWorkshop}
                    style={{
                      width: previewFrame.w * previewScale,
                      height: previewFrame.h * previewScale,
                      backgroundImage: `url("${RANCH_ACTIONS_URL}")`,
                      backgroundSize: `${RANCH_ACTIONS_SIZE.w * previewScale}px ${RANCH_ACTIONS_SIZE.h * previewScale}px`,
                      backgroundPositionX: -previewFrame.x * previewScale,
                      backgroundPositionY: -previewFrame.y * previewScale,
                      '--machine-x': `${-previewFrame.x * previewScale}px`,
                      '--machine-end-x': `${-(previewFrame.x + previewFrame.w * 4) * previewScale}px`,
                    } as React.CSSProperties}
                  />
                </span>
                <div>
                  <strong>
                    {activeDef.nameVi} (Cấp {activeStation.level}/3)
                  </strong>{' '}
                  · Hàng đợi {activeStation.queue.length}/
                  {workshopCapacitySlots(selectedWorkshop, activeStation.level)}
                  <div style={{ opacity: 0.85 }}>{activeDef.descriptionVi}</div>
                  <span className={`cozy-badge ${phase === 'ready' ? 'cozy-badge--ok' : 'cozy-badge--warm'}`}>
                    {previewStatus}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {onCollectDeepWorkshop && activeStation.queue.some((j) => serverNow >= j.endMs) ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="btn btn--primary btn--sm"
                    onClick={() => void run(() => onCollectDeepWorkshop(selectedWorkshop))}
                  >
                    <CheckCircle2 size={14} style={{ marginRight: 4 }} />
                    Nhận thành phẩm
                  </button>
                ) : null}
                {onUpgradeDeepWorkshop && activeStation.level < 3 ? (
                  <button
                    type="button"
                    disabled={
                      busy ||
                      walletCoins <
                        (activeStation.level === 1
                          ? activeDef.upgradeCostL2Coins
                          : activeDef.upgradeCostL3Coins)
                    }
                    className="btn btn--secondary btn--sm"
                    onClick={() => void run(() => onUpgradeDeepWorkshop(selectedWorkshop))}
                  >
                    <ArrowUpCircle size={14} style={{ marginRight: 4 }} />
                    Nâng cấp ({activeStation.level === 1 ? activeDef.upgradeCostL2Coins : activeDef.upgradeCostL3Coins} xu)
                  </button>
                ) : null}
              </div>
            </div>

            {activeStation.queue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#503721' }}>Hàng đợi</div>
                {activeStation.queue.map((job) => {
                  const ready = serverNow >= job.endMs;
                  const remSec = Math.max(0, Math.ceil((job.endMs - serverNow) / 1000));
                  const name = getItem(job.outputSku)?.nameVi ?? job.outputSku;
                  const waiting = serverNow < job.startMs;
                  const progress = machineJobProgress(job, serverNow);
                  return (
                    <div
                      key={job.jobId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '6px 8px',
                        borderRadius: 8,
                        background: '#f6e9cc',
                        color: '#503721',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CatalogSkuIcon sku={job.outputSku} size={22} />
                        <div className="ranch-workshop__job">
                          <span>{name} ×{job.outputQty}</span>
                          <progress max={1} value={progress} aria-label={`Tiến độ ${name}`} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: ready ? '#2a6537' : '#754327' }}>
                          {ready ? 'Sẵn sàng thu' : waiting ? 'Đang chờ' : `Còn ${formatRemainingSec(remSec * 1000)}`}
                        </span>
                        {!ready && onCancelDeepJob ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run(() => onCancelDeepJob(selectedWorkshop, job.jobId))}
                            className="btn btn--secondary btn--sm"
                            title="Hủy & hoàn 100% nguyên liệu"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))',
                gap: 8,
              }}
            >
              {activeRecipes.map((rec) => {
                const canCraft = rec.inputs.every((i) => (sharedQty.get(i.sku) ?? 0) >= i.qty);
                const queueFull =
                  activeStation.queue.length >=
                  workshopCapacitySlots(selectedWorkshop, activeStation.level);
                return (
                  <div
                    key={rec.recipeId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 6,
                      padding: 8,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.9)',
                      color: '#3f2c1b',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CatalogSkuIcon sku={rec.outputSku} size={26} />
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {rec.outputNameVi} ×{rec.outputQty}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>{Math.round(rec.craftMs / 1000)} giây</div>
                      </div>
                    </div>
                    <div className="ranch-workshop__ingredients">
                      {rec.inputs.map((inp) => {
                        const label = getItem(inp.sku)?.nameVi ?? inp.sku;
                        const quantity = `${sharedQty.get(inp.sku) ?? 0}/${inp.qty}`;
                        return (
                          <span key={inp.sku} title={label} aria-label={`${label} ${quantity}`}>
                            <CatalogSkuIcon sku={inp.sku} size={20} />
                            <span aria-hidden="true">{quantity}</span>
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={busy || !canCraft || queueFull}
                      onClick={() => void run(() => onQueueDeepRecipe!(selectedWorkshop, rec.recipeId))}
                      className="btn btn--primary btn--sm"
                    >
                      {queueFull ? 'Đầy khay' : canCraft ? 'Chế biến' : 'Thiếu nguyên liệu'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
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
