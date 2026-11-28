import { vietnamDayIndex } from '../economy/shippingBin';
import { applyFarmShippingBinSale, type FarmShippingMeta } from '../farming/farmShipping';
import { sellCropLine } from '../farming/serverApply';
import { TILE_SIZE } from '../maps';
import { FARM_WORLD_INTERACTABLES } from '../world/farmPlotContract';
import { BACKPACK_TIERS, BACKPACK_UPGRADE_COSTS, physicalError, type PhysicalCommand, type PhysicalInventoryEdit } from './physicalInventory';
import { isProtectedPhysicalStack, positionIsUsable } from './physicalInventoryLifecycle';
import type { InventoryEntry } from './inventoryTypes';

type EconomyCommand = Extract<PhysicalCommand, { kind: 'upgrade_backpack' | 'sell' }>;
type Location = { mapId: string; x?: number; y?: number } | null;
type Channel = Extract<EconomyCommand, { kind: 'sell' }>['channel'];

export function physicalSaleChannel(position: Location): Channel | null {
  if (position?.mapId === 'shop_crop_market' || position?.mapId === 'shop') return 'market';
  const bin = FARM_WORLD_INTERACTABLES.shipping_bin;
  if (position?.mapId === 'farm' && positionIsUsable(position)
    && Math.hypot(position.x - (bin.tileX + 0.5) * TILE_SIZE, position.y - (bin.tileY + 0.5) * TILE_SIZE) <= 42) {
    return 'shipping';
  }
  return null;
}

interface EconomyContext {
  readonly worldId: string;
  readonly coins: number;
  readonly position: Location;
  readonly shipping?: FarmShippingMeta;
  readonly nowMs: number;
  readonly idempotencyKey: string;
}

export function editPhysicalEconomy(
  edit: PhysicalInventoryEdit,
  command: EconomyCommand,
  ctx: EconomyContext,
): { coins: number; shipping?: FarmShippingMeta } {
  if (command.kind === 'upgrade_backpack') {
    if (ctx.position?.mapId !== 'home') physicalError('FORBIDDEN', 'Về nhà để nâng cấp ba lô.');
    const player = edit.player();
    const next = player.tier + 1;
    const price = BACKPACK_UPGRADE_COSTS[player.tier as keyof typeof BACKPACK_UPGRADE_COSTS];
    const capacity = BACKPACK_TIERS[next as keyof typeof BACKPACK_TIERS];
    if (typeof price !== 'number' || typeof capacity !== 'number') physicalError('INVALID', 'Ba lô đã mở hết ô.');
    if (ctx.coins < price) physicalError('INSUFFICIENT_FUNDS', 'Chưa đủ xu để mở thêm ô.');
    edit.setPlayer({ ...player, tier: next });
    edit.setCapacity(capacity);
    return { coins: ctx.coins - price };
  }

  if (command.from.container !== 'backpack' || physicalSaleChannel(ctx.position) !== command.channel) {
    physicalError('FORBIDDEN', 'Hãy mang món trong ba lô tới chợ hoặc thùng hàng.');
  }
  const { container, stack } = edit.source(command.from, command.stackId, command.qty);
  if (isProtectedPhysicalStack(stack) || edit.catalog.get(stack.itemSku)?.essential) {
    physicalError('PROTECTED', 'Món này đang được bảo vệ.');
  }
  // The legacy pricing functions work on a temporary projection of this one exact slot.
  const projected: InventoryEntry[] = [{
    worldId: ctx.worldId, itemSku: stack.itemSku, ownerScope: 'shared', quality: stack.quality,
    qty: stack.qty, updatedAt: new Date(ctx.nowMs).toISOString(),
  }];
  let coins: number;
  let shipping: FarmShippingMeta | undefined;
  if (command.channel === 'market') {
    const sale = sellCropLine(ctx.coins, projected, stack.itemSku, command.qty, stack.quality);
    if (!sale.ok) physicalError('INVALID', sale.messageVi);
    coins = sale.walletCoins;
  } else {
    const sale = applyFarmShippingBinSale(ctx.coins, projected, ctx.shipping
      ?? { soldByGroup: {}, dayIndex: vietnamDayIndex(ctx.nowMs) }, {
      actorId: edit.userId, idempotencyKey: ctx.idempotencyKey, nowMs: ctx.nowMs,
      lines: [{ sku: stack.itemSku, qty: command.qty, quality: stack.quality }],
    });
    if (!sale.ok) physicalError('INVALID', sale.messageVi);
    coins = sale.walletCoins;
    shipping = sale.meta;
  }
  if (!Number.isSafeInteger(coins) || coins < 0 || coins > 2_147_483_647) {
    physicalError('INVALID', 'Ví không thể nhận thêm số xu này.');
  }
  edit.take(container, command.from.index, stack, command.qty);
  return { coins, shipping };
}
