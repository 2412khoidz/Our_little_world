/**
 * 8 Cooperative Production Workshops & Generic Timestamped Craft Queue (Checkpoint E).
 *
 * Transplanted from:
 * - `KrasimirKralev/harvest-hollow` @ 9b23e1a (shared/content/recipes.js, buildings.js, shared/rules/actions/crafting.js)
 * - `Shiz0id/webfarmville` @ c420bc2 (shared/src/content/buildings.ts, workshops.ts, meadowbrookWorkshopQueue.ts)
 *
 * Pure TypeScript — zero DOM/Phaser/network dependencies.
 */
import { DEEP_FARMING_RAW_ENTRIES } from '../catalog/deepFarmingContent.ts';
import { getItem } from '../economy/catalogConfig.ts';
import type { Rng } from '../rng.ts';
import type { QualityTier } from './types.ts';

export type WorkshopId =
  | 'mill'
  | 'bakery'
  | 'preserves'
  | 'dairy'
  | 'feed_mill'
  | 'loom'
  | 'florist'
  | 'kitchen';

export interface WorkshopDef {
  readonly id: WorkshopId;
  readonly nameVi: string;
  readonly descriptionVi: string;
  readonly baseSlots: number;
  readonly maxStorageQueue: number;
  readonly upgradeCostL2Coins: number;
  readonly upgradeCostL3Coins: number;
}

export const WORKSHOP_DEFS: readonly WorkshopDef[] = [
  {
    id: 'mill',
    nameVi: 'Cối xay bột & ép dầu',
    descriptionVi: 'Xay lúa, ngô, yến mạch thành bột mịn và ép dầu thực vật nguyên chất.',
    baseSlots: 2,
    maxStorageQueue: 6,
    upgradeCostL2Coins: 450,
    upgradeCostL3Coins: 1_100,
  },
  {
    id: 'dairy',
    nameVi: 'Xưởng sữa & phô mai',
    descriptionVi: 'Đánh bơ tươi, ủ phô mai vàng và chế biến kem vani mật ong.',
    baseSlots: 2,
    maxStorageQueue: 6,
    upgradeCostL2Coins: 650,
    upgradeCostL3Coins: 1_500,
  },
  {
    id: 'bakery',
    nameVi: 'Tiệm bánh nông trại',
    descriptionVi: 'Nướng bánh mì nóng giòn, bánh táo, bánh bí ngô và bánh kem.',
    baseSlots: 2,
    maxStorageQueue: 6,
    upgradeCostL2Coins: 600,
    upgradeCostL3Coins: 1_400,
  },
  {
    id: 'preserves',
    nameVi: 'Xưởng mứt & đồ muối',
    descriptionVi: 'Nấu mứt trái cây đóng hũ thủy tinh và muối chua rau củ.',
    baseSlots: 2,
    maxStorageQueue: 6,
    upgradeCostL2Coins: 550,
    upgradeCostL3Coins: 1_300,
  },
  {
    id: 'feed_mill',
    nameVi: 'Cối trộn thức ăn & phân bón',
    descriptionVi: 'Nghiền cám nuôi gia súc gia cầm và ủ phân tăng chất lượng cây trồng.',
    baseSlots: 3,
    maxStorageQueue: 8,
    upgradeCostL2Coins: 350,
    upgradeCostL3Coins: 850,
  },
  {
    id: 'loom',
    nameVi: 'Xưởng dệt len thủ công',
    descriptionVi: 'Xe sợi len cừu, len thỏ Angora và dệt khăn choàng, chăn ấm.',
    baseSlots: 2,
    maxStorageQueue: 6,
    upgradeCostL2Coins: 700,
    upgradeCostL3Coins: 1_600,
  },
  {
    id: 'florist',
    nameVi: 'Tiệm hoa & nến thơm',
    descriptionVi: 'Kết bó hoa nghệ thuật từ hoa lai hiếm và đổ nến sáp ong thơm dịu.',
    baseSlots: 2,
    maxStorageQueue: 6,
    upgradeCostL2Coins: 600,
    upgradeCostL3Coins: 1_450,
  },
  {
    id: 'kitchen',
    nameVi: 'Bếp hợp tác gia đình',
    descriptionVi: 'Chế biến súp rau, món cá tươi và mâm cơm ấm cúng hai người.',
    baseSlots: 2,
    maxStorageQueue: 6,
    upgradeCostL2Coins: 500,
    upgradeCostL3Coins: 1_200,
  },
];

export const WORKSHOP_DEF_BY_ID: Readonly<Record<WorkshopId, WorkshopDef>> = {
  mill: WORKSHOP_DEFS[0]!,
  dairy: WORKSHOP_DEFS[1]!,
  bakery: WORKSHOP_DEFS[2]!,
  preserves: WORKSHOP_DEFS[3]!,
  feed_mill: WORKSHOP_DEFS[4]!,
  loom: WORKSHOP_DEFS[5]!,
  florist: WORKSHOP_DEFS[6]!,
  kitchen: WORKSHOP_DEFS[7]!,
};

export interface WorkshopRecipeDef {
  readonly recipeId: string;
  readonly workshopId: WorkshopId;
  readonly outputSku: string;
  readonly outputNameVi: string;
  readonly outputQty: number;
  readonly craftMs: number;
  readonly inputs: ReadonlyArray<{ readonly sku: string; readonly qty: number }>;
  readonly qualitySupported: boolean;
}

function categoryToWorkshop(category: string): WorkshopId | null {
  if (category === 'mill') return 'mill';
  if (category === 'bakery') return 'bakery';
  if (category === 'preserves') return 'preserves';
  if (category === 'dairy') return 'dairy';
  if (category === 'livestock_feed' || category === 'fertilizer') return 'feed_mill';
  if (category === 'loom') return 'loom';
  if (category === 'florist') return 'florist';
  if (category === 'dish') return 'kitchen';
  return null;
}

const STARTER_WORKSHOP_RECIPES: readonly WorkshopRecipeDef[] = [
  {
    recipeId: 'flour',
    workshopId: 'mill',
    outputSku: 'flour',
    outputNameVi: 'Bột mì',
    outputQty: 1,
    craftMs: 60_000,
    inputs: [{ sku: 'wheat', qty: 2 }],
    qualitySupported: false,
  },
  {
    recipeId: 'sakura_bouquet',
    workshopId: 'florist',
    outputSku: 'sakura_bouquet',
    outputNameVi: 'Bó hoa anh đào',
    outputQty: 1,
    craftMs: 90_000,
    inputs: [
      { sku: 'rose_pink', qty: 2 },
      { sku: 'sunflower', qty: 1 },
      { sku: 'ribbon', qty: 1 },
    ],
    qualitySupported: true,
  },
  {
    recipeId: 'carrot_soup',
    workshopId: 'kitchen',
    outputSku: 'carrot_soup',
    outputNameVi: 'Súp cà rốt',
    outputQty: 1,
    craftMs: 120_000,
    inputs: [
      { sku: 'carrot', qty: 2 },
      { sku: 'wild_herb', qty: 1 },
    ],
    qualitySupported: false,
  },
  {
    recipeId: 'herb_carp',
    workshopId: 'kitchen',
    outputSku: 'herb_carp',
    outputNameVi: 'Cá chép thảo mộc',
    outputQty: 1,
    craftMs: 120_000,
    inputs: [
      { sku: 'carp_pond', qty: 1 },
      { sku: 'wild_herb', qty: 1 },
    ],
    qualitySupported: false,
  },
  {
    recipeId: 'peach_tea',
    workshopId: 'kitchen',
    outputSku: 'peach_tea',
    outputNameVi: 'Trà đào',
    outputQty: 1,
    craftMs: 90_000,
    inputs: [
      { sku: 'peach', qty: 2 },
      { sku: 'sugar_pack', qty: 1 },
    ],
    qualitySupported: false,
  },
  {
    recipeId: 'strawberry_tart',
    workshopId: 'kitchen',
    outputSku: 'strawberry_tart',
    outputNameVi: 'Bánh tart dâu',
    outputQty: 1,
    craftMs: 150_000,
    inputs: [
      { sku: 'flour', qty: 1 },
      { sku: 'strawberry', qty: 2 },
      { sku: 'spice', qty: 1 },
    ],
    qualitySupported: false,
  },
  {
    recipeId: 'koinori_platter',
    workshopId: 'kitchen',
    outputSku: 'koinori_platter',
    outputNameVi: 'Đĩa koi nori',
    outputQty: 1,
    craftMs: 150_000,
    inputs: [
      { sku: 'koi_pastel', qty: 1 },
      { sku: 'cabbage', qty: 1 },
      { sku: 'carrot', qty: 1 },
    ],
    qualitySupported: false,
  },
];

const DEEP_WORKSHOP_RECIPES: readonly WorkshopRecipeDef[] = DEEP_FARMING_RAW_ENTRIES.flatMap((entry) => {
  const workshopId = categoryToWorkshop(entry.category);
  if (!workshopId || !entry.inputs || entry.inputs.length === 0) return [];
  return [
    {
      recipeId: entry.sku,
      workshopId,
      outputSku: entry.sku,
      outputNameVi: entry.nameVi,
      outputQty: entry.batchQty ?? 1,
      craftMs: Math.max(30_000, entry.batchDurationMs ?? 60_000),
      inputs: entry.inputs.map((inp) => ({ sku: inp.sku, qty: inp.qty })),
      qualitySupported: Boolean(entry.qualityTiers && entry.qualityTiers.includes('silver')),
    },
  ];
});

export const ALL_WORKSHOP_RECIPES: readonly WorkshopRecipeDef[] = [
  ...STARTER_WORKSHOP_RECIPES,
  ...DEEP_WORKSHOP_RECIPES,
];

export const WORKSHOP_RECIPES_BY_ID: ReadonlyMap<string, WorkshopRecipeDef> = new Map(
  ALL_WORKSHOP_RECIPES.map((r) => [r.recipeId, r]),
);

export function recipesForWorkshop(workshopId: WorkshopId): WorkshopRecipeDef[] {
  return ALL_WORKSHOP_RECIPES.filter((r) => r.workshopId === workshopId);
}

export interface WorkshopJob {
  readonly jobId: string;
  readonly recipeId: string;
  readonly outputSku: string;
  readonly outputQty: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly startedBy: string;
  readonly reservedInputs?: ReadonlyArray<{ sku: string; qty: number; quality: QualityTier }>;
}

export interface WorkshopInstanceState {
  readonly level: 1 | 2 | 3;
  readonly queue: readonly WorkshopJob[];
}

export interface WorkshopsWorldState {
  readonly stations: Readonly<Record<WorkshopId, WorkshopInstanceState>>;
  readonly nextJobSeq: number;
}

export function createWorkshopsState(): WorkshopsWorldState {
  return {
    stations: {
      mill: { level: 1, queue: [] },
      bakery: { level: 1, queue: [] },
      preserves: { level: 1, queue: [] },
      dairy: { level: 1, queue: [] },
      feed_mill: { level: 1, queue: [] },
      loom: { level: 1, queue: [] },
      florist: { level: 1, queue: [] },
      kitchen: { level: 1, queue: [] },
    },
    nextJobSeq: 1,
  };
}

export function workshopCapacitySlots(workshopId: WorkshopId, level: 1 | 2 | 3): number {
  const def = WORKSHOP_DEF_BY_ID[workshopId];
  return Math.min(def.maxStorageQueue, def.baseSlots + (level - 1) * 2);
}

export function workshopSpeedMultiplierBp(level: 1 | 2 | 3): number {
  if (level === 3) return 7_000;
  if (level === 2) return 8_500;
  return 10_000;
}

export function queueWorkshopJob(
  state: WorkshopsWorldState,
  workshopId: WorkshopId,
  recipeId: string,
  nowMs: number,
  actorId: string,
):
  | {
      ok: true;
      state: WorkshopsWorldState;
      job: WorkshopJob;
      consumedInputs: ReadonlyArray<{ sku: string; qty: number }>;
    }
  | { ok: false; code: string; messageVi: string } {
  const recipe = WORKSHOP_RECIPES_BY_ID.get(recipeId);
  if (!recipe || recipe.workshopId !== workshopId) {
    return { ok: false, code: 'UNKNOWN_RECIPE', messageVi: 'Công thức không thuộc xưởng này.' };
  }
  const station = state.stations[workshopId];
  const cap = workshopCapacitySlots(workshopId, station.level);
  if (station.queue.length >= cap) {
    return {
      ok: false,
      code: 'QUEUE_FULL',
      messageVi: `Hàng đợi xưởng đã đầy (${cap}/${cap} khay). Hãy nhận bớt thành phẩm.`,
    };
  }

  const lastEnd =
    station.queue.length > 0 ? station.queue[station.queue.length - 1]!.endMs : nowMs;
  const startMs = Math.max(nowMs, lastEnd);
  const adjustedDuration = Math.max(
    10_000,
    Math.round((recipe.craftMs * workshopSpeedMultiplierBp(station.level)) / 10_000),
  );
  const job: WorkshopJob = {
    jobId: `job_${workshopId}_${state.nextJobSeq}`,
    recipeId: recipe.recipeId,
    outputSku: recipe.outputSku,
    outputQty: recipe.outputQty,
    startMs,
    endMs: startMs + adjustedDuration,
    startedBy: actorId,
  };

  const nextStation: WorkshopInstanceState = {
    ...station,
    queue: [...station.queue, job],
  };

  return {
    ok: true,
    state: {
      stations: { ...state.stations, [workshopId]: nextStation },
      nextJobSeq: state.nextJobSeq + 1,
    },
    job,
    consumedInputs: recipe.inputs,
  };
}

export function cancelWorkshopJob(
  state: WorkshopsWorldState,
  workshopId: WorkshopId,
  jobId: string,
  nowMs: number,
):
  | {
      ok: true;
      state: WorkshopsWorldState;
      refundInputs: ReadonlyArray<{ sku: string; qty: number; quality?: QualityTier }>;
    }
  | { ok: false; code: string; messageVi: string } {
  const station = state.stations[workshopId];
  const idx = station.queue.findIndex((j) => j.jobId === jobId);
  if (idx < 0) return { ok: false, code: 'NOT_FOUND', messageVi: 'Không tìm thấy đơn chế biến.' };
  const target = station.queue[idx]!;
  if (nowMs >= target.endMs) {
    return {
      ok: false,
      code: 'ALREADY_FINISHED',
      messageVi: 'Món này đã làm xong, hãy nhận thay vì hủy.',
    };
  }
  const recipe = WORKSHOP_RECIPES_BY_ID.get(target.recipeId);
  const refundInputs = target.reservedInputs ?? recipe?.inputs ?? [];

  // Rebuild timestamps cleanly for queued jobs downstream of the cancelled slot
  const remaining = station.queue.filter((_, i) => i !== idx);
  const rebuilt: WorkshopJob[] = [];
  let cursor = nowMs;
  for (const job of remaining) {
    if (job.startMs <= nowMs) {
      rebuilt.push(job);
      cursor = Math.max(cursor, job.endMs);
    } else {
      const duration = Math.max(10_000, job.endMs - job.startMs);
      const startMs = Math.max(nowMs, cursor);
      const endMs = startMs + duration;
      rebuilt.push({ ...job, startMs, endMs });
      cursor = endMs;
    }
  }

  return {
    ok: true,
    state: {
      ...state,
      stations: { ...state.stations, [workshopId]: { ...station, queue: rebuilt } },
    },
    refundInputs,
  };
}

export function collectWorkshopReadyJobs(
  state: WorkshopsWorldState,
  workshopId: WorkshopId,
  nowMs: number,
  rng: Rng,
  canAcceptOutput?: (sku: string, qty: number) => boolean,
):
  | {
      ok: true;
      state: WorkshopsWorldState;
      collected: ReadonlyArray<{ sku: string; qty: number; quality: QualityTier; bonusAdded: boolean }>;
    }
  | { ok: false; code: string; messageVi: string } {
  const station = state.stations[workshopId];
  const ready = station.queue.filter((j) => nowMs >= j.endMs);
  if (ready.length === 0) {
    return { ok: false, code: 'NONE_READY', messageVi: 'Chưa có thành phẩm nào hoàn tất.' };
  }

  const kept: WorkshopJob[] = [];
  const collected: { sku: string; qty: number; quality: QualityTier; bonusAdded: boolean }[] = [];

  for (const job of station.queue) {
    if (nowMs < job.endMs) {
      kept.push(job);
      continue;
    }
    const recipe = WORKSHOP_RECIPES_BY_ID.get(job.recipeId);
    const bonusAdded = station.level === 3 && rng() < 0.25;
    const finalQty = job.outputQty + (bonusAdded ? 1 : 0);

    if (canAcceptOutput && !canAcceptOutput(job.outputSku, finalQty)) {
      kept.push(job);
      continue;
    }

    const itemDef = getItem(job.outputSku);
    const supportsQuality =
      Boolean(recipe?.qualitySupported) && Boolean(itemDef?.qualityTiers.includes('silver'));
    const roll = rng();
    const quality: QualityTier = !supportsQuality
      ? 'normal'
      : roll < (station.level === 3 ? 0.2 : 0.08)
        ? 'gold'
        : roll < 0.35
          ? 'silver'
          : 'normal';
    collected.push({ sku: job.outputSku, qty: finalQty, quality, bonusAdded });
  }

  if (collected.length === 0) {
    return {
      ok: false,
      code: 'STORAGE_FULL',
      messageVi: 'Kho đã đầy, không thể nhận thêm thành phẩm này.',
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      stations: { ...state.stations, [workshopId]: { ...station, queue: kept } },
    },
    collected,
  };
}

export function upgradeWorkshopStation(
  state: WorkshopsWorldState,
  workshopId: WorkshopId,
  walletCoins: number,
):
  | { ok: true; state: WorkshopsWorldState; newLevel: 2 | 3; costCoins: number }
  | { ok: false; code: string; messageVi: string } {
  const station = state.stations[workshopId];
  const def = WORKSHOP_DEF_BY_ID[workshopId];
  if (station.level >= 3) {
    return { ok: false, code: 'MAX_LEVEL', messageVi: `${def.nameVi} đã đạt cấp tối đa.` };
  }
  const newLevel: 2 | 3 = station.level === 1 ? 2 : 3;
  const costCoins = newLevel === 2 ? def.upgradeCostL2Coins : def.upgradeCostL3Coins;
  if (walletCoins < costCoins) {
    return {
      ok: false,
      code: 'INSUFFICIENT_FUNDS',
      messageVi: `Cần ${costCoins} xu để nâng cấp ${def.nameVi} lên cấp ${newLevel}.`,
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      stations: {
        ...state.stations,
        [workshopId]: { ...station, level: newLevel },
      },
    },
    newLevel,
    costCoins,
  };
}
