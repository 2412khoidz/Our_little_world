import {
  PhysicalInventoryEdit, physicalError, physicalSlots, readPhysicalContainer,
  type PhysicalCatalog, type PhysicalInventory,
} from '../shared/inventory/physicalInventory';

const TOOL_FAMILIES = [
  ['tool_hoe', 'tool_hoe_copper', 'tool_hoe_iron', 'tool_hoe_gold'],
  ['tool_watering_can', 'tool_can_copper', 'tool_can_iron', 'tool_can_gold'],
  ['water_pitcher'],
  ['rod_basic', 'rod_sturdy', 'rod_bamboo'],
  ['tool_shovel'],
] as const;

export function pendingStarterTools(state: PhysicalInventory, userId: string, catalog: PhysicalCatalog): string[] {
  const claimed = new Set(state.starterClaims?.[userId]);
  const owned = new Set(physicalSlots(readPhysicalContainer(state, 'backpack', userId))
    .filter(({ stack }) => (stack.metadata?.durability ?? 1) > 0).map(({ stack }) => stack.itemSku));
  return TOOL_FAMILIES.flatMap(([basic, ...alternatives]) =>
    catalog.has(basic) && !claimed.has(basic) && ![basic, ...alternatives].some((sku) => owned.has(sku)) ? [basic] : []);
}

export function claimStarterTools(state: PhysicalInventory, userId: string, catalog: PhysicalCatalog): PhysicalInventory {
  const pending = pendingStarterTools(state, userId, catalog);
  if (!pending.length) return state;
  const edit = new PhysicalInventoryEdit(state, userId, catalog, true);
  for (const sku of pending) {
    const id = edit.newId();
    if (!edit.insert(edit.edit('backpack'), {
      id, itemSku: sku, qty: 1, quality: 'normal', metadata: { instanceId: 'starter-' + id, starterOwner: userId },
    })) physicalError('FULL', 'Ba lô đầy.');
  }
  return { ...edit.finish(), starterClaims: { ...state.starterClaims, [userId]: [...(state.starterClaims?.[userId] ?? []), ...pending] } };
}
