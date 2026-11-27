/**
 * Upgradable Tool Chains (Checkpoint E).
 * Adapted from `KrasimirKralev/harvest-hollow` @ 9b23e1a (shared/content/tools.js)
 * & `fernforge-arcade/greens` @ 3f32fd8 (src/game/data/items.js).
 */
import { getItem } from '../economy/catalogConfig.ts';

export type ToolFamily = 'watering_can' | 'hoe' | 'sickle' | 'seeder' | 'basket';

export interface ToolUpgradeDef {
  readonly sku: string;
  readonly family: ToolFamily;
  readonly tier: number;
  readonly nameVi: string;
  readonly footprintLabelVi: string;
  readonly priceCoins: number;
}

const RAW_TOOL_UPGRADES: readonly ToolUpgradeDef[] = [
  { sku: 'tool_hoe_copper', family: 'hoe', tier: 1, nameVi: 'Cuốc đồng (2 ô)', footprintLabelVi: '1×2 ô', priceCoins: 300 },
  { sku: 'tool_hoe_iron', family: 'hoe', tier: 2, nameVi: 'Cuốc thép (2×2)', footprintLabelVi: '2×2 ô', priceCoins: 640 },
  { sku: 'tool_hoe_gold', family: 'hoe', tier: 3, nameVi: 'Cuốc vàng (3×3)', footprintLabelVi: '3×3 ô', priceCoins: 1_320 },
  { sku: 'tool_can_copper', family: 'watering_can', tier: 1, nameVi: 'Bình tưới đồng (2 ô)', footprintLabelVi: '1×2 ô', priceCoins: 320 },
  { sku: 'tool_can_iron', family: 'watering_can', tier: 2, nameVi: 'Bình tưới thép (2×2)', footprintLabelVi: '2×2 ô', priceCoins: 680 },
  { sku: 'tool_can_gold', family: 'watering_can', tier: 3, nameVi: 'Bình tưới vàng (3×3)', footprintLabelVi: '3×3 ô', priceCoins: 1_400 },
  { sku: 'tool_sickle_wide', family: 'sickle', tier: 1, nameVi: 'Liềm rộng (2×2)', footprintLabelVi: '2×2 ô', priceCoins: 720 },
  { sku: 'tool_sickle_grand', family: 'sickle', tier: 2, nameVi: 'Đại liềm vàng (3×3)', footprintLabelVi: '3×3 ô', priceCoins: 1_500 },
  { sku: 'tool_seed_spreader', family: 'seeder', tier: 1, nameVi: 'Khay gieo hạt (2×2)', footprintLabelVi: '2×2 ô', priceCoins: 820 },
  { sku: 'tool_basket_orchard', family: 'basket', tier: 1, nameVi: 'Giỏ hái cây ăn quả (+1 quả)', footprintLabelVi: '+1 trái', priceCoins: 480 },
];

export const TOOL_UPGRADE_CATALOG: readonly ToolUpgradeDef[] = RAW_TOOL_UPGRADES.map((t) => ({
  ...t,
  priceCoins: getItem(t.sku)?.storeBuy ?? t.priceCoins,
}));

export function bestOwnedToolForFamily(
  ownedSkus: ReadonlySet<string>,
  family: ToolFamily,
): ToolUpgradeDef | null {
  let best: ToolUpgradeDef | null = null;
  for (const tool of TOOL_UPGRADE_CATALOG) {
    if (tool.family !== family) continue;
    if (!ownedSkus.has(tool.sku)) continue;
    if (!best || tool.tier > best.tier) best = tool;
  }
  return best;
}
