import { adjustInventoryQuantity, normalizeInventoryRows } from './inventoryLedger.mjs';

export const INVENTORY_STARTER_VERSION = 1;
export const STARTER_WALLET_COINS = 50;

const ESSENTIAL_TOOLS = ['tool_hoe', 'tool_watering_can', 'water_pitcher', 'rod_basic'];
const NEW_WORLD_ITEMS = [
  ['seed_wheat', 5],
  ['seed_carrot', 2],
  ['bait_free_worm', 10],
  ['fish_salmon_bite', 2, 'silver'],
  ['toy_yarn', 1],
  ['toy_cardboard_box', 1],
];

export function initializeWorldInventory(inventory, worldId, updatedAt, newWorld) {
  const items = normalizeInventoryRows(inventory, worldId);
  for (const sku of ESSENTIAL_TOOLS) {
    if (!items.some((row) => row.ownerScope === 'shared' && row.itemSku === sku)) {
      adjustInventoryQuantity(items, worldId, 'shared', sku, 1, updatedAt);
    }
  }
  if (newWorld) {
    for (const [sku, qty, quality] of NEW_WORLD_ITEMS) {
      adjustInventoryQuantity(items, worldId, 'shared', sku, qty, updatedAt, quality);
    }
  }
  return items;
}
