import { gameAudio } from '../../game/audio/gameAudioManager';
import { gameEventBus } from '../../game/eventBus';
import { getMapDefinition } from '../../shared/maps';
import type { MapId } from '../../shared/types';
import type { ContextualAction, HeldItemState, InteractionActionCode } from '../../shared/interaction/interactionTypes';
import { plotIdFromInteractableId } from '../../shared/farming/gardenPlotLayout';
import { PET_KIBBLE_BASIC_SKU } from '../../shared/inventory/inventoryRules';
import { isPetCareModeActive } from '../../shared/petLiving/petCare/petCareModeFlag';
import { waterPitcherAfterFill, waterPitcherPourDelta } from '../../shared/interaction/homeBowlPresentation';
import { farmShopKindForInteractableTarget } from '../../shared/shop/farmShopCatalog';
import type { FarmShopKind } from '../../shared/shop/farmShopCatalog';

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
  onFarmApply?: (
    plotIndex: number,
    action: 'till' | 'plant' | 'water' | 'harvest' | 'fertilize' | 'place_sprinkler' | 'remove_sprinkler',
    seedSku?: string | null,
    opts?: {
      fertilizerSku?: import('../../shared/farming/farmSnapshotTypes').FarmApplyParams['fertilizerSku'];
      sprinklerSku?: import('../../shared/farming/farmSnapshotTypes').FarmApplyParams['sprinklerSku'];
      toolSku?: string | null;
    },
  ) => Promise<void>;
  onOpenFarmMarket?: (shopKind?: FarmShopKind) => void;
  onOpenFarmShipping?: () => void;
  onOpenDonorFishing?: (spotId?: string) => void;
  onOpenDonorStreamFishing?: () => void;
  onOpenDonorWorkshop?: (focus?: import('../../shared/donor/donorWorkshopFocus').DonorWorkshopFocus) => void;
  onNotice: (message: string, isError?: boolean) => void;
  livingPetLocalSimulation?: boolean;
  donorLanPlayable?: boolean;
}

function emitDiegeticOpen(code: InteractionActionCode, targetId?: string): boolean {
  switch (code) {
    case 'open_wardrobe':
      gameEventBus.emit('evt:open-avatar-customizer');
      return true;
    case 'open_study':
      gameEventBus.emit('cmd:seat-at-desk', { seat: 'left' });
      gameEventBus.emit('evt:open-study-panel');
      return true;
    case 'open_mailbox':
      gameEventBus.emit('evt:open-mailbox');
      return true;
    case 'open_photo_frame':
      gameEventBus.emit('evt:open-photo-frame');
      return true;
    case 'sit_sofa':
      gameEventBus.emit('evt:request-couple-posture', { kind: 'sofa_sit', targetId });
      return true;
    case 'lie_bed':
      gameEventBus.emit('evt:request-couple-posture', { kind: 'bed_lie', targetId });
      return true;
    case 'sit_bench':
      gameEventBus.emit('evt:request-couple-posture', { kind: 'bench_sit', targetId });
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
    if (isPetCareModeActive()) {
      gameEventBus.emit('cmd:pet-care-action', { kind: 'brush' });
      ctx.onNotice('Chải lông nhẹ nhàng (gần — chưa ghi server).');
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

  const mainGameBowlPlayable =
    ctx.mapId === 'home' && (ctx.livingPetLocalSimulation || ctx.donorLanPlayable);

  if (code === 'fill_water_pitcher') {
    if (isPetCareModeActive()) {
      gameEventBus.emit('cmd:pet-care-action', { kind: 'pour_water' });
      ctx.onNotice('Bình đầy — rót vào bát gần (mô phỏng, chưa RPC bát).');
      return;
    }
    const sku =
      ctx.heldItem.itemSku === 'tool_watering_can' ? 'tool_watering_can' : 'water_pitcher';
    void gameAudio.unlock();
    gameAudio.playSfx('get_water', { volumeScale: 0.85 });
    gameEventBus.emit('evt:held-water-adjust', {
      level: waterPitcherAfterFill(),
      iconId: 'water_pitcher_full',
      itemSku: sku,
    });
    ctx.onNotice(
      sku === 'tool_watering_can'
        ? 'Đã múc đầy bình tưới cây (0₫)!'
        : 'Đã múc đầy bình nước mát (0₫)!',
    );
    return;
  }

  if (code === 'pour_water_bowl') {
    if (isPetCareModeActive()) {
      gameEventBus.emit('cmd:pet-care-action', { kind: 'pour_water' });
      ctx.onNotice('Rót nước vào bát gần (mô phỏng, chưa RPC bát).');
      return;
    }
    if (mainGameBowlPlayable) {
      const nextLevel = waterPitcherPourDelta(ctx.heldItem.waterFillLevel);
      gameEventBus.emit('evt:held-water-adjust', {
        level: nextLevel,
        iconId: nextLevel > 0 ? 'water_pitcher_full' : 'water_pitcher_empty',
        itemSku: 'water_pitcher',
      });
      gameEventBus.emit('cmd:apply-home-bowl', { kind: 'water' });
      ctx.onNotice('Đã rót nước vào bát — bé có thể uống khi khát.');
      return;
    }
    ctx.onNotice(MISSION02_PENDING_VI, true);
    return;
  }

  if (code === 'fill_food_bowl') {
    if (isPetCareModeActive()) {
      gameEventBus.emit('cmd:pet-care-action', {
        kind: 'offer_food',
        sku: ctx.heldItem.itemSku ?? PET_KIBBLE_BASIC_SKU,
        quality: ctx.heldItem.quality ?? 'normal',
        ownerScope: ctx.heldItem.ownerScope ?? 'shared',
      });
      ctx.onNotice('Đổ vào bát trong chế độ chăm sóc — dùng J khi cầm món.');
      return;
    }
    if (mainGameBowlPlayable) {
      gameEventBus.emit('cmd:apply-home-bowl', { kind: 'food' });
      ctx.onNotice('Đã đổ thức ăn vào bát — bé sẽ tự ghé khi đói.');
      return;
    }
    ctx.onNotice(MISSION02_PENDING_VI, true);
    return;
  }

  if (code === 'enter_barn_shop') {
    if (!ctx.donorLanPlayable) {
      ctx.onNotice('Cửa chuồng chưa mở ngoài bản preview ruộng.', true);
      return;
    }
    const shopDef = getMapDefinition('shop');
    gameEventBus.emit('evt:request-map-change', {
      targetMapId: 'shop',
      spawnX: shopDef.defaultSpawn.tileX,
      spawnY: shopDef.defaultSpawn.tileY,
      portalId: 'farm_barn_door',
    });
    ctx.onNotice('Bước vào cửa hàng Bác Hai…');
    return;
  }

  if (code === 'talk_npc') {
    gameEventBus.emit('cmd:interact-npc');
    return;
  }

  if (code === 'use_portal') {
    const def = getMapDefinition(ctx.mapId);
    const portal = def.portals.find((p) => p.id === action.targetId);
    if (portal) {
      gameEventBus.emit('evt:request-map-change', {
        targetMapId: portal.targetMapId,
        spawnX: portal.targetSpawnX,
        spawnY: portal.targetSpawnY,
        portalId: action.targetId,
      });
    }
    return;
  }

  if (emitDiegeticOpen(code, action.targetId)) return;

  const plotId = plotIdFromInteractableId(action.targetId);
  if (plotId != null && ctx.onFarmApply) {
    const heldSku = ctx.heldItem.itemSku;
    const toolOpts = heldSku?.startsWith('tool_') ? { toolSku: heldSku } : undefined;
    if (code === 'till_plot') {
      await ctx.onFarmApply(plotId, 'till', undefined, toolOpts);
      return;
    }
    if (code === 'plant_crop') {
      await ctx.onFarmApply(plotId, 'plant', heldSku, toolOpts);
      return;
    }
    if (code === 'water_crop') {
      await ctx.onFarmApply(plotId, 'water', undefined, toolOpts);
      const carrierSku = heldSku;
      if (
        carrierSku === 'tool_watering_can' ||
        carrierSku === 'water_pitcher' ||
        carrierSku?.startsWith('tool_can_')
      ) {
        const nextLevel = Math.max(0, (ctx.heldItem.waterFillLevel || 100) - 10);
        gameEventBus.emit('evt:held-water-adjust', {
          level: nextLevel,
          iconId: nextLevel > 0 ? 'water_pitcher_full' : 'water_pitcher_empty',
          itemSku: carrierSku,
        });
      }
      return;
    }
    if (code === 'fertilize_plot') {
      await ctx.onFarmApply(plotId, 'fertilize', undefined, {
        fertilizerSku: heldSku as import('../../shared/farming/farmSnapshotTypes').FarmApplyParams['fertilizerSku'],
      });
      return;
    }
    if (code === 'place_sprinkler') {
      await ctx.onFarmApply(plotId, 'place_sprinkler', undefined, {
        sprinklerSku: heldSku as import('../../shared/farming/farmSnapshotTypes').FarmApplyParams['sprinklerSku'],
      });
      return;
    }
    if (code === 'remove_sprinkler') {
      await ctx.onFarmApply(plotId, 'remove_sprinkler');
      return;
    }
    if (code === 'harvest_crop') {
      await ctx.onFarmApply(plotId, 'harvest', undefined, toolOpts);
      return;
    }
  }
  if (code === 'open_farm_market' && ctx.onOpenFarmMarket) {
    const shopKind = action.targetId
      ? farmShopKindForInteractableTarget(action.targetId)
      : 'seed';
    ctx.onOpenFarmMarket(shopKind);
    return;
  }
  if (code === 'open_shipping_bin' && ctx.onOpenFarmShipping) {
    ctx.onOpenFarmShipping();
    return;
  }
  if (code === 'open_donor_fishing' && ctx.onOpenDonorFishing) {
    ctx.onOpenDonorFishing(action.donorFishingSpotId);
    return;
  }
  if (code === 'open_donor_stream_fishing' && ctx.onOpenDonorFishing) {
    ctx.onOpenDonorFishing('east_stream');
    return;
  }
  if (code === 'open_donor_workshop' && ctx.onOpenDonorWorkshop) {
    ctx.onOpenDonorWorkshop(action.workshopFocus);
    return;
  }

  if (code === 'inspect_prop') {
    ctx.onNotice(action.labelVi);
    return;
  }

  ctx.onNotice('Thao tác chưa được nối vào game chính.');
}