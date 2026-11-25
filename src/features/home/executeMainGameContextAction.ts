import { gameEventBus } from '../../game/eventBus';
import { getMapDefinition } from '../../shared/maps';
import type { MapId } from '../../shared/types';
import type { ContextualAction, HeldItemState, InteractionActionCode } from '../../shared/interaction/interactionTypes';
import { plotIdFromInteractableId } from '../../shared/farming/gardenPlotLayout';
import { PET_KIBBLE_BASIC_SKU } from '../../shared/inventory/inventoryRules';

const MISSION02_PENDING_VI =
  'Tính năng này chờ giao dịch kho chính thức (Mission 02). Hãy dùng bảng mèo hoặc tủ đồ tạm thời.';

export interface MainGameActionContext {
  mapId: MapId;
  heldItem: HeldItemState;
  hasPet: boolean;
  petCanFeed: boolean;
  onOpenInventory: () => void;
  onFeedPetAuthoritative: () => Promise<void>;
  onPetPetAuthoritative: () => Promise<void>;
  onFarmApply?: (plotIndex: number, action: 'till' | 'plant' | 'water' | 'harvest', seedSku?: string | null) => Promise<void>;
  onOpenFarmMarket?: () => void;
  onOpenFarmShipping?: () => void;
  onOpenFarmPantry?: () => void;
  onNotice: (message: string, isError?: boolean) => void;
}

function emitDiegeticOpen(code: InteractionActionCode): boolean {
  switch (code) {
    case 'open_wardrobe':
      gameEventBus.emit('evt:open-avatar-customizer');
      return true;
    case 'open_study':
      gameEventBus.emit('evt:open-study-panel');
      return true;
    case 'open_mailbox':
      gameEventBus.emit('evt:open-mailbox');
      return true;
    case 'open_photo_frame':
      gameEventBus.emit('evt:open-photo-frame');
      return true;
    case 'sit_sofa':
      gameEventBus.emit('evt:request-couple-posture', { kind: 'sofa_sit' });
      return true;
    case 'lie_bed':
      gameEventBus.emit('evt:request-couple-posture', { kind: 'bed_lie' });
      return true;
    case 'sit_bench':
      gameEventBus.emit('evt:request-couple-posture', { kind: 'bench_sit' });
      return true;
    default:
      return false;
  }
}

export async function executeMainGameContextAction(
  action: ContextualAction,
  ctx: MainGameActionContext,
): Promise<void> {
  if (!action.available) {
    ctx.onNotice(action.reasonVi ?? 'Hiện chưa thể thực hiện thao tác này.', true);
    return;
  }

  const { code } = action;

  if (code === 'put_away_held') {
    return;
  }

  if (code === 'offer_food_pet') {
    if (!ctx.hasPet) {
      gameEventBus.emit('evt:open-pet-panel');
      ctx.onNotice('Hãy nhận nuôi bé mèo trong bảng chăm sóc trước.');
      return;
    }
    if (ctx.heldItem.itemKind !== 'food' || !ctx.heldItem.itemSku) {
      ctx.onNotice('Hãy chọn thức ăn trên thanh đồ (1–8).');
      return;
    }
    if (ctx.heldItem.itemSku !== PET_KIBBLE_BASIC_SKU || (ctx.heldItem.ownerScope ?? 'shared') !== 'shared' || ctx.heldItem.quality !== 'normal') {
      ctx.onNotice(MISSION02_PENDING_VI, true);
      return;
    }
    if (!ctx.petCanFeed) {
      ctx.onNotice('Bé chưa sẵn sàng ăn hoặc đang hồi thời gian.', true);
      return;
    }
    await ctx.onFeedPetAuthoritative();
    return;
  }

  if (code === 'pet_cat') {
    if (!ctx.hasPet) {
      gameEventBus.emit('evt:open-pet-panel');
      return;
    }
    await ctx.onPetPetAuthoritative();
    return;
  }

  if (
    code === 'fill_food_bowl' ||
    code === 'pour_water_bowl' ||
    code === 'fill_water_pitcher' ||
    code === 'roll_toy' ||
    code === 'place_cardboard_box'
  ) {
    ctx.onNotice(MISSION02_PENDING_VI, true);
    return;
  }

  if (code === 'use_portal') {
    const def = getMapDefinition(ctx.mapId);
    const portal = def.portals.find((p) => p.id === action.targetId) ?? def.portals[0];
    if (portal) {
      gameEventBus.emit('evt:request-map-change', {
        targetMapId: portal.targetMapId,
        spawnX: portal.targetSpawnX,
        spawnY: portal.targetSpawnY,
      });
    }
    return;
  }

  if (emitDiegeticOpen(code)) return;

  const plotId = plotIdFromInteractableId(action.targetId);
  if (plotId != null && ctx.onFarmApply) {
    if (code === 'till_plot') {
      await ctx.onFarmApply(plotId, 'till');
      return;
    }
    if (code === 'plant_crop') {
      await ctx.onFarmApply(plotId, 'plant', ctx.heldItem.itemSku);
      return;
    }
    if (code === 'water_crop') {
      await ctx.onFarmApply(plotId, 'water');
      return;
    }
    if (code === 'harvest_crop') {
      await ctx.onFarmApply(plotId, 'harvest');
      return;
    }
  }
  if (code === 'open_farm_market' && ctx.onOpenFarmMarket) {
    ctx.onOpenFarmMarket();
    return;
  }
  if (code === 'open_shipping_bin' && ctx.onOpenFarmShipping) {
    ctx.onOpenFarmShipping();
    return;
  }
  if (code === 'open_farm_pantry' && ctx.onOpenFarmPantry) {
    ctx.onOpenFarmPantry();
    return;
  }

  if (code === 'inspect_prop') {
    ctx.onNotice(action.labelVi);
    return;
  }

  ctx.onNotice('Thao tác chưa được nối vào game chính.');
}