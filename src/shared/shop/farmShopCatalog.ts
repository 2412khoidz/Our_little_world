/**
 * Worker K — canonical in-game shop listings (catalog JSON authority).
 * UI reads SKUs from here; prices always from `ITEM_CATALOG` via `requireItem`.
 *
 * File ownership: economy workers touch `catalogConfig.ts` / SQL generator;
 * shop workers touch this module + `FarmEconomyPanel` only.
 */
import { ITEM_CATALOG, requireItem } from '../economy/catalogConfig.ts';
import type { MilestoneId } from '../economy/types.ts';
import { isMilestoneAtOrBefore } from '../economy/types.ts';

export type FarmShopKind = 'seed' | 'tool';

export interface FarmShopKindMeta {
  readonly kind: FarmShopKind;
  readonly titleVi: string;
  readonly layout: 'row' | 'grid';
  /** Cabacos interior donor reference (art only — not gameplay authority). */
  readonly donorInteriorRef: string;
}

export const FARM_SHOP_KIND_META: Readonly<Record<FarmShopKind, FarmShopKindMeta>> = {
  seed: {
    kind: 'seed',
    titleVi: 'Gian hạt Bác Hai',
    layout: 'row',
    donorInteriorRef: 'Cabacos Seed_shop.tmj @ 79e423d',
  },
  tool: {
    kind: 'tool',
    titleVi: 'Quầy dụng cụ · mồi',
    layout: 'grid',
    donorInteriorRef: 'Cabacos tool_shop.tmj @ 79e423d',
  },
};

/** Target ids on `shop_tool.json` counter → tool shop grid (not seed rows). */
const TOOL_SHOP_TARGET_IDS = new Set(['cabacos_interior_tool_shop_counter']);

export function farmShopKindForInteractableTarget(targetId: string): FarmShopKind {
  return TOOL_SHOP_TARGET_IDS.has(targetId) ? 'tool' : 'seed';
}

function isBuyableAtMilestone(sku: string, milestone: MilestoneId = 'V0.2.2'): boolean {
  const def = requireItem(sku);
  if ((def.storeBuy ?? 0) <= 0) return false;
  return isMilestoneAtOrBefore(def.milestone, milestone);
}

/** All seed SKUs sold at seed shops — mirrors `ITEM_CATALOG` (no placeholder SKUs). */
export function farmShopSeedSkus(milestone: MilestoneId = 'V0.2.0'): readonly string[] {
  return ITEM_CATALOG.filter(
    (entry) => entry.group === 'seed' && isBuyableAtMilestone(entry.sku, milestone),
  ).map((entry) => entry.sku);
}

/** Tool-shop grid: bait + pantry staples with a store price (Fishing Frenzy / Tidefall hooks). */
export function farmShopToolSkus(milestone: MilestoneId = 'V0.2.2'): readonly string[] {
  return ITEM_CATALOG.filter(
    (entry) =>
      (entry.group === 'bait' || entry.group === 'pantry') && isBuyableAtMilestone(entry.sku, milestone),
  ).map((entry) => entry.sku);
}

export function farmShopSkusForKind(
  kind: FarmShopKind,
  milestone: MilestoneId = 'V0.2.2',
): readonly string[] {
  return kind === 'seed' ? farmShopSeedSkus(milestone) : farmShopToolSkus(milestone);
}

export function farmShopMetaForKind(kind: FarmShopKind): FarmShopKindMeta {
  return FARM_SHOP_KIND_META[kind];
}