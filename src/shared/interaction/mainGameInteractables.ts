import { getCatalogItem } from '../catalog';
import { getMapDefinition, TILE_SIZE } from '../maps';
import type { FurniturePlacement, MapId } from '../types';
import {
  buildFarmSlicePlotInteractables,
  FARM_SLICE_SEED_SHOP_TILE,
  PRIMARY_FARM_MAP_ID,
} from '../farming/farmPlayableBridge';
import { FARM_ZONE_MAP_ID } from '../world/farmPlotContract';
import { MAIN_GAME_WORLD_ANCHORS, portalCenterPx } from './mainGameWorldAnchors';
import type { InteractableTarget } from './interactionTypes';

export interface MainGameInteractableInput {
  mapId: MapId;
  placements: readonly FurniturePlacement[];
  petWorldPosition: { x: number; y: number } | null;
  petVisible: boolean;
  mailboxUnread: number;
  /** Presentation-only bowl hints until Mission 02 authoritative state. */
  bowlPresentation?: { foodEmpty: boolean; foodFull: boolean; waterEmpty: boolean; waterFull: boolean };
  donorEconomyDev?: boolean;
}

export function buildMainGameInteractables(input: MainGameInteractableInput): InteractableTarget[] {
  const { mapId, placements, petWorldPosition, petVisible, mailboxUnread, bowlPresentation, donorEconomyDev } = input;
  const targets: InteractableTarget[] = [];
  const def = getMapDefinition(mapId);

  for (const portal of def.portals) {
    const center = portalCenterPx(mapId, portal);
    targets.push({
      id: portal.id,
      kind: 'portal',
      labelVi: portal.labelVi,
      x: center.x,
      y: center.y,
      maxRadiusPx: portal.radiusTiles * TILE_SIZE + 6,
    });
  }

  if (mapId === 'home') {
    const anchors = MAIN_GAME_WORLD_ANCHORS.home;
    targets.push({
      id: 'food_bowl',
      kind: 'food_bowl',
      labelVi: 'Bát ăn',
      x: anchors.foodBowlPx.x,
      y: anchors.foodBowlPx.y,
      maxRadiusPx: 34,
      empty: bowlPresentation?.foodEmpty ?? true,
      full: bowlPresentation?.foodFull ?? false,
    });
    targets.push({
      id: 'water_bowl',
      kind: 'water_bowl',
      labelVi: 'Bát nước',
      x: anchors.waterBowlPx.x,
      y: anchors.waterBowlPx.y,
      maxRadiusPx: 34,
      empty: bowlPresentation?.waterEmpty ?? true,
      full: bowlPresentation?.waterFull ?? false,
    });
    targets.push({
      id: 'water_source',
      kind: 'water_source',
      labelVi: 'Vòi nước bếp',
      x: anchors.kitchenWaterPx.x,
      y: anchors.kitchenWaterPx.y,
      maxRadiusPx: 48,
    });
    targets.push({
      id: 'photo_frame',
      kind: 'photo_frame',
      labelVi: 'Xem khung ảnh kỷ niệm',
      x: anchors.photoFramePx.x,
      y: anchors.photoFramePx.y,
      maxRadiusPx: 40,
    });

    if (petVisible && petWorldPosition) {
      targets.push({
        id: 'pet',
        kind: 'pet',
        labelVi: 'Bé mèo',
        x: petWorldPosition.x,
        y: petWorldPosition.y,
        maxRadiusPx: 44,
      });
    }
  }

  if (mapId === 'outdoor') {
    const anchors = MAIN_GAME_WORLD_ANCHORS.outdoor;
    targets.push({
      id: 'outdoor_mailbox',
      kind: 'mailbox',
      labelVi:
        mailboxUnread > 0 ? `Hòm thư hiên (${mailboxUnread} thư mới)` : 'Hòm thư hiên nhà',
      x: anchors.porchMailboxPx.x,
      y: anchors.porchMailboxPx.y,
      maxRadiusPx: 44,
    });
    targets.push({
      id: 'outdoor_picnic',
      kind: 'bench',
      labelVi: 'Ngồi picnic (xem ảnh kỷ niệm)',
      x: anchors.picnicPx.x,
      y: anchors.picnicPx.y,
      maxRadiusPx: 48,
    });
    targets.push({
      id: 'outdoor_minigame',
      kind: 'bench',
      labelVi: 'Bàn mini-game (hotseat — chưa multiplayer)',
      x: anchors.minigameTablePx.x,
      y: anchors.minigameTablePx.y,
      maxRadiusPx: 44,
    });
    targets.push({
      id: 'outdoor_fishing',
      kind: 'fishing_spot',
      labelVi: donorEconomyDev ? 'Cầu câu ao Meadowbrook (chill)' : 'Cầu câu — chưa mở fishing V0.2',
      x: anchors.pondDockPx.x,
      y: anchors.pondDockPx.y,
      maxRadiusPx: 52,
      donorPlayable: donorEconomyDev === true,
    });
    if (donorEconomyDev) {
      targets.push({
        id: 'outdoor_stream',
        kind: 'fishing_spot',
        labelVi: 'Suối phía Đông (tension — canvas-games)',
        x: anchors.streamBankPx.x,
        y: anchors.streamBankPx.y,
        maxRadiusPx: 54,
        donorPlayable: true,
      });
    }
    targets.push({
      id: 'outdoor_market',
      kind: 'shop_npc',
      labelVi: 'Chợ Bác Hai — chưa mở giao dịch',
      x: anchors.marketStallPx.x,
      y: anchors.marketStallPx.y,
      maxRadiusPx: 50,
    });
    targets.push({
      id: 'outdoor_sunset',
      kind: 'bench',
      labelVi: 'Ghế ngắm hoàng hôn',
      x: anchors.sunsetBenchPx.x,
      y: anchors.sunsetBenchPx.y,
      maxRadiusPx: 46,
    });
    targets.push({
      id: 'outdoor_farm',
      kind: 'crop_plot',
      labelVi: 'Luống rau — chưa mở farming V0.2',
      x: anchors.farmGatePx.x,
      y: anchors.farmGatePx.y,
      maxRadiusPx: 48,
    });
  }

  if (mapId === 'garden') {
    const anchors = MAIN_GAME_WORLD_ANCHORS.garden;
    targets.push({
      id: 'water_source',
      kind: 'water_source',
      labelVi: 'Nước hồ sạch',
      x: anchors.pondWaterPx.x,
      y: anchors.pondWaterPx.y,
      maxRadiusPx: 54,
    });
    targets.push({
      id: 'mailbox',
      kind: 'mailbox',
      labelVi:
        mailboxUnread > 0 ? `Hộp thư (${mailboxUnread} thư mới)` : 'Mở hộp thư kỷ niệm',
      x: anchors.mailboxPx.x,
      y: anchors.mailboxPx.y,
      maxRadiusPx: 40,
    });
  }

  if (mapId === PRIMARY_FARM_MAP_ID || mapId === FARM_ZONE_MAP_ID) {
    targets.push(...buildFarmSlicePlotInteractables());
    targets.push({
      id: 'farm_seed_shop',
      kind: 'shop_npc',
      labelVi: 'Gian hạt Bác Hai — mua hạt (C1)',
      x: FARM_SLICE_SEED_SHOP_TILE.tileX * TILE_SIZE + TILE_SIZE / 2,
      y: FARM_SLICE_SEED_SHOP_TILE.tileY * TILE_SIZE + TILE_SIZE / 2,
      maxRadiusPx: 44,
      donorPlayable: donorEconomyDev === true,
    });
    targets.push({
      id: 'farm_pond_fishing',
      kind: 'fishing_spot',
      labelVi: donorEconomyDev ? 'Ao cá — câu chill (donor)' : 'Ao cá — câu (V0.2)',
      x: 52 * TILE_SIZE + TILE_SIZE / 2,
      y: 11 * TILE_SIZE + TILE_SIZE / 2,
      maxRadiusPx: 54,
      donorPlayable: donorEconomyDev === true,
    });
    targets.push({
      id: 'farm_barn_mill',
      kind: 'workshop_building',
      labelVi: donorEconomyDev ? 'Xưởng — cối + lò + chế biến' : 'Xưởng — chưa mở',
      x: (FARM_SLICE_SEED_SHOP_TILE.tileX + 3) * TILE_SIZE + TILE_SIZE / 2,
      y: FARM_SLICE_SEED_SHOP_TILE.tileY * TILE_SIZE + TILE_SIZE / 2,
      maxRadiusPx: 48,
      donorPlayable: donorEconomyDev === true,
    });
  }

  for (const p of placements) {
    if (p.mapId !== mapId) continue;
    const item = getCatalogItem(p.sku);
    if (!item) continue;
    const cx = (p.tileX + (p.widthTiles - 1) / 2) * TILE_SIZE;
    const cy = (p.tileY + (p.heightTiles - 1) / 2) * TILE_SIZE;

    if (item.interactTag === 'wardrobe') {
      targets.push({
        id: `placement-${p.id}`,
        kind: 'wardrobe',
        labelVi: 'Thay trang phục',
        x: cx,
        y: cy,
        maxRadiusPx: 36,
      });
    } else if (item.interactTag === 'study_preview' || p.sku === 'desk_study') {
      targets.push({
        id: `placement-${p.id}`,
        kind: 'study_desk',
        labelVi: 'Ngồi vào bàn học',
        x: cx,
        y: cy,
        maxRadiusPx: 40,
      });
    } else if (p.sku === 'sofa_cream') {
      targets.push({
        id: `placement-${p.id}`,
        kind: 'sofa',
        labelVi: 'Ngồi sofa cùng nhau',
        x: cx,
        y: cy,
        maxRadiusPx: 40,
      });
    } else if (p.sku === 'bench_garden') {
      targets.push({
        id: `placement-${p.id}`,
        kind: 'bench',
        labelVi: 'Ngồi ghế vườn',
        x: cx,
        y: cy,
        maxRadiusPx: 40,
      });
    } else if (p.sku === 'bed_cozy') {
      targets.push({
        id: `placement-${p.id}`,
        kind: 'bed',
        labelVi: 'Nằm nghỉ cùng nhau',
        x: cx,
        y: cy,
        maxRadiusPx: 42,
      });
    }
  }

  return targets;
}