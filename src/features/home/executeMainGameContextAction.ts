import { gameEventBus } from '../../game/eventBus';
import { getMapDefinition } from '../../shared/maps';
import type { MapId } from '../../shared/types';
import type { ContextualAction, HeldItemState, InteractionActionCode } from '../../shared/interaction/interactionTypes';
import { PET_KIBBLE_BASIC_SKU } from '../../shared/inventory/inventoryRules';
import { isPetCareModeActive } from '../../shared/petLiving/petCare/petCareModeFlag';

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
  onNotice: (message: string, isError?: boolean) => void;
  livingPetLocalSimulation?: boolean;
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
    if (isPetCareModeActive()) {
      const sku = ctx.heldItem.itemSku ?? PET_KIBBLE_BASIC_SKU;
      gameEventBus.emit('cmd:pet-care-action', {
        kind: 'offer_food',
        sku,
        quality: ctx.heldItem.quality ?? 'normal',
        ownerScope: ctx.heldItem.ownerScope ?? 'shared',
      });
      ctx.onNotice('Bé ngửi món — đợi máy chủ xác nhận…');
      return;
    }
    if (ctx.livingPetLocalSimulation) {
      const sku = ctx.heldItem.itemSku ?? PET_KIBBLE_BASIC_SKU;
      gameEventBus.emit('cmd:pet-local-food-offer', {
        offerId: `local-offer-${Date.now()}`,
        caregiverId: 'local-player',
        sku,
        quality: ctx.heldItem.quality ?? 'normal',
      });
      ctx.onNotice('Bé đánh hơi món — mô phỏng cục bộ (chưa trừ kho).');
      return;
    }
    if (!ctx.petCanFeed) {
      ctx.onNotice('Bé chưa sẵn sàng ăn hoặc đang hồi thời gian.', true);
      return;
    }
    await ctx.onFeedPetAuthoritative();
    return;
  }

  if (code === 'enter_pet_care') {
    if (!ctx.hasPet) {
      gameEventBus.emit('evt:open-pet-panel');
      return;
    }
    gameEventBus.emit('cmd:pet-care-mode', { active: true });
    ctx.onNotice('Vuốt trực tiếp lên mèo — chọn đồ trên thanh (1–8) rồi J.');
    return;
  }

  if (code === 'pet_cat') {
    if (!ctx.hasPet) {
      gameEventBus.emit('evt:open-pet-panel');
      return;
    }
    if (ctx.livingPetLocalSimulation && isPetCareModeActive()) {
      gameEventBus.emit('cmd:pet-care-action', { kind: 'brush' });
      ctx.onNotice('Chải lông nhẹ nhàng…');
      return;
    }
    await ctx.onPetPetAuthoritative();
    return;
  }

  if (code === 'roll_toy') {
    if (!ctx.hasPet) {
      ctx.onNotice('Chưa có bé mèo trong nhà.');
      return;
    }
    if (ctx.livingPetLocalSimulation) {
      const sku = ctx.heldItem.itemSku ?? 'toy_yarn';
      const kind = sku === 'toy_cardboard_box' ? 'toy_box' : 'toy_yarn';
      gameEventBus.emit('cmd:pet-care-action', { kind, sku });
      if (!isPetCareModeActive()) {
        gameEventBus.emit('cmd:pet-care-mode', { active: true });
      }
      ctx.onNotice(sku === 'toy_cardboard_box' ? 'Bé chui vào hộp!' : 'Cuộn len lăn tăm tắp~');
      return;
    }
    ctx.onNotice(MISSION02_PENDING_VI, true);
    return;
  }

  if (code === 'place_cardboard_box') {
    if (ctx.livingPetLocalSimulation && ctx.hasPet) {
      gameEventBus.emit('cmd:pet-care-action', { kind: 'toy_box', sku: 'toy_cardboard_box' });
      if (!isPetCareModeActive()) gameEventBus.emit('cmd:pet-care-mode', { active: true });
      ctx.onNotice('Đặt hộp xuống để bé chơi.');
      return;
    }
    ctx.onNotice(MISSION02_PENDING_VI, true);
    return;
  }

  if (code === 'fill_food_bowl' || code === 'pour_water_bowl' || code === 'fill_water_pitcher') {
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

  if (code === 'inspect_prop') {
    ctx.onNotice(action.labelVi);
    return;
  }

  ctx.onNotice('Thao tác chưa được nối vào game chính.');
}