/**
 * Simulation constants and persona/profile tables.
 *
 * All values are design inputs, not measured outcomes. Anything not specified in
 * docs is marked as an assumption so the report can separate spec from guesswork.
 */

import type { ItemQuality } from '../types.ts';
import type { MilestoneId } from '../types.ts';
import type { PersonaDefinition, PersonaId, ProfileId, SimProfile } from './types.ts';

export const DAY_MS = 86_400_000;
/** Fixed epoch so runs never depend on the wall clock. */
export const START_MS = Date.UTC(2026, 0, 1, 8, 0, 0);

/** Active-play seconds per action. Assumptions unless stated otherwise. */
export const ACTION_SECONDS = {
  forage: 60,
  plant: 30,
  harvest: 30,
  fish: 180,
  cook: 240,
  sell: 15,
  buy: 15,
  decor: 60,
} as const;

/** Forage node respawn (MARKET_AND_NPC only says "periodically"). */
export const FORAGE_RESPAWN_SECONDS = 180;

/** Starting household wallet used by the V0.2.0 balance assumption. */
export const STARTING_COINS = 120;

/** Quality roll weights for a normal harvest (farming doc: soil/weather luck). */
export const QUALITY_WEIGHTS: readonly { readonly value: ItemQuality; readonly weight: number }[] = [
  { value: 'normal', weight: 70 },
  { value: 'silver', weight: 20 },
  { value: 'gold', weight: 10 },
];

/** Quality roll used when a watering boost is applied (farming doc: +25% boost). */
export const QUALITY_WEIGHTS_WATERED: readonly { readonly value: ItemQuality; readonly weight: number }[] = [
  { value: 'normal', weight: 50 },
  { value: 'silver', weight: 30 },
  { value: 'gold', weight: 20 },
];

export interface DecorSink {
  readonly id: string;
  readonly nameVi: string;
  readonly cost: number;
  readonly milestone: MilestoneId;
}

/** Currency sinks from docs/economy/BALANCING_PLAN.md §2. */
export const DECOR_SINKS: readonly DecorSink[] = [
  { id: 'decor_small', nameVi: 'Trang trí nhỏ', cost: 45, milestone: 'V0.2.0' },
  { id: 'pet_toy', nameVi: 'Đồ chơi thú cưng', cost: 80, milestone: 'V0.2.0' },
  { id: 'furniture_nice', nameVi: 'Nội thất đẹp', cost: 180, milestone: 'V0.2.1' },
  { id: 'room_corner', nameVi: 'Hoàn thiện góc phòng', cost: 420, milestone: 'V0.2.5' },
  { id: 'house_upgrade', nameVi: 'Mở rộng nhà cấp 1', cost: 1_400, milestone: 'V0.3.0' },
];

/** Deadlock probe: buy the cheapest seed, under 10 minutes of play. */
export const RECOVERY_TARGET_SKU = 'seed_wheat';
export const RECOVERY_DEADLINE_SECONDS = 600;

/** Dominant strategy guard (ECONOMY_SIMULATOR_SPEC). */
export const DOMINANT_STRATEGY_GUARD = 2.2;

export const DEFAULT_MILESTONES: readonly number[] = [7, 30, 90, 180];

export const PERSONAS: readonly PersonaDefinition[] = [
  {
    id: 'casual',
    nameVi: 'Casual',
    descriptionVi: '1–2 lần/ngày × 10–15 phút, làm đủ việc nhẹ',
    dailyActiveSeconds: [600, 900],
    weights: { forage: 0.35, farm: 0.45, fish: 0.1, cook: 0.1 },
    decorAffinity01: 0.35,
    playEveryDays: null,
    awayDaysRange: null,
  },
  {
    id: 'solo',
    nameVi: 'Solo',
    descriptionVi: 'Chỉ một người tích cực, người kia tạm bận',
    dailyActiveSeconds: [600, 900],
    weights: { forage: 0.25, farm: 0.45, fish: 0.15, cook: 0.15 },
    decorAffinity01: 0.25,
    playEveryDays: null,
    awayDaysRange: null,
  },
  {
    id: 'coop',
    nameVi: 'Co-op',
    descriptionVi: 'Cả hai cùng online, phối hợp trồng + câu + nấu',
    dailyActiveSeconds: [1_500, 2_000],
    weights: { forage: 0.2, farm: 0.4, fish: 0.2, cook: 0.2 },
    decorAffinity01: 0.4,
    playEveryDays: null,
    awayDaysRange: null,
  },
  {
    id: 'optimizer',
    nameVi: 'Optimizer',
    descriptionVi: 'Chọn công thức xu/phút cao nhất (kiểm tra monoculture)',
    dailyActiveSeconds: [1_800, 1_800],
    weights: { forage: 0, farm: 1, fish: 0, cook: 0 },
    decorAffinity01: 0,
    playEveryDays: null,
    awayDaysRange: null,
  },
  {
    id: 'decorator',
    nameVi: 'Decorator',
    descriptionVi: 'Ưu tiên mua nội thất, ít cày nấu ăn/đơn',
    dailyActiveSeconds: [900, 1_200],
    weights: { forage: 0.5, farm: 0.35, fish: 0.05, cook: 0.1 },
    decorAffinity01: 1,
    playEveryDays: null,
    awayDaysRange: null,
  },
  {
    id: 'long_absence',
    nameVi: 'Long absence',
    descriptionVi: 'Chơi 1 lần/tuần rồi nghỉ 14–30 ngày',
    dailyActiveSeconds: [1_200, 1_800],
    weights: { forage: 0.3, farm: 0.4, fish: 0.15, cook: 0.15 },
    decorAffinity01: 0.2,
    playEveryDays: 7,
    awayDaysRange: [14, 30],
  },
  {
    id: 'mixed_craft_fish',
    nameVi: 'Mixed craft & fish',
    descriptionVi: 'Ưu tiên câu cá + chế biến thay vì trồng trọt',
    dailyActiveSeconds: [1_200, 1_500],
    weights: { forage: 0.2, farm: 0.2, fish: 0.35, cook: 0.25 },
    decorAffinity01: 0.3,
    playEveryDays: null,
    awayDaysRange: null,
  },
];

/**
 * Milestone profiles.
 *
 * The starter garden has 12 plots (WORLD_PROGRESSION §2 tier 1/7: 12 → 24 → 36
 * as the garden expands at V0.2.4); only the starter tier is simulated.
 */
export const PROFILES: readonly SimProfile[] = [
  {
    id: 'v020',
    labelVi: 'V0.2.0 — Economy foundation (forage + Shipping Bin only)',
    milestone: 'V0.2.0',
    features: { forage: true, farming: false, fishing: false, cooking: false, orders: false },
    plotCount: 0,
    forage: { points: 2, respawnSeconds: FORAGE_RESPAWN_SECONDS, skus: ['wild_herb', 'wood_branch'] },
  },
  {
    id: 'v021',
    labelVi: 'V0.2.1 — + Farming (12 starter plots)',
    milestone: 'V0.2.1',
    features: { forage: true, farming: true, fishing: false, cooking: false, orders: false },
    plotCount: 12,
    forage: { points: 2, respawnSeconds: FORAGE_RESPAWN_SECONDS, skus: ['wild_herb', 'wood_branch'] },
  },
  {
    id: 'v022',
    labelVi: 'V0.2.2 — + Fishing',
    milestone: 'V0.2.2',
    features: { forage: true, farming: true, fishing: true, cooking: false, orders: false },
    plotCount: 12,
    forage: { points: 2, respawnSeconds: FORAGE_RESPAWN_SECONDS, skus: ['wild_herb', 'wood_branch'] },
  },
  {
    id: 'v030',
    labelVi: 'V0.3.0 — + Cooking (assumed profile, recipes not shipped)',
    milestone: 'V0.3.0',
    features: { forage: true, farming: true, fishing: true, cooking: true, orders: false },
    plotCount: 12,
    forage: { points: 2, respawnSeconds: FORAGE_RESPAWN_SECONDS, skus: ['wild_herb', 'wood_branch'] },
  },
];

export function getPersona(id: PersonaId): PersonaDefinition {
  const found = PERSONAS.find((persona) => persona.id === id);
  if (!found) {
    throw new Error(`Unknown persona: ${id}`);
  }
  return found;
}

export function getProfile(id: ProfileId): SimProfile {
  const found = PROFILES.find((profile) => profile.id === id);
  if (!found) {
    throw new Error(`Unknown profile: ${id}`);
  }
  return found;
}

/** Rarity table for fishing encounters (3 tiers per GAME_DESIGN §3). */
export const FISH_TABLE: readonly {
  readonly sku: string;
  readonly weight: number;
  readonly baitSku: string;
}[] = [
  { sku: 'carp_pond', weight: 70, baitSku: 'bait_free_worm' },
  { sku: 'koi_pastel', weight: 20, baitSku: 'bait_shrimp' },
  { sku: 'lotus_trout', weight: 10, baitSku: 'bait_shrimp' },
];
