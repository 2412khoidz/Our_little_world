import { getCatalogItem } from '../catalog';
import { getMapDefinition, TILE_SIZE } from '../maps';
import type { FurniturePlacement, MapId } from '../types';
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
}

export function buildMainGameInteractables(input: MainGameInteractableInput): InteractableTarget[] {
  const { mapId, placements, petWorldPosition, petVisible, mailboxUnread, bowlPresentation } = input;
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