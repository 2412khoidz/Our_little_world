import type { FurnitureCatalogItem, FurniturePlacement, MapId } from './types';

export const STARTER_FURNITURE_CATALOG: readonly FurnitureCatalogItem[] = [
  {
    sku: 'bed_cozy',
    nameVi: 'Giường đôi ấm áp',
    descriptionVi: 'Chăn hoa đào êm ái cho căn phòng chung.',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 2,
    heightTiles: 2,
    blocksMovement: true,
    starterQuantity: 1,
    sprite: { x: 0, y: 0, w: 32, h: 32 },
  },
  {
    sku: 'wardrobe_oak',
    nameVi: 'Tủ đồ gỗ sồi',
    descriptionVi: 'Đứng cạnh tủ để thay đổi ngoại hình nhân vật.',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 1,
    sprite: { x: 32, y: 0, w: 16, h: 32 },
    interactTag: 'wardrobe',
  },
  {
    sku: 'bookshelf_warm',
    nameVi: 'Kệ sách nhỏ',
    descriptionVi: 'Góc sách bình yên (nhật ký cặp đôi sẽ mở ở V0.3).',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 1,
    sprite: { x: 48, y: 0, w: 16, h: 32 },
  },
  {
    sku: 'lamp_floor',
    nameVi: 'Đèn đứng ánh vàng',
    descriptionVi: 'Tạo ánh sáng dịu ấm vào buổi tối.',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 2,
    sprite: { x: 64, y: 0, w: 16, h: 32 },
  },
  {
    sku: 'sofa_cream',
    nameVi: 'Ghế sofa kem',
    descriptionVi: 'Góc thư giãn (rạp phim chung dự kiến mở ở V0.4).',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 2,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 1,
    sprite: { x: 80, y: 0, w: 32, h: 24 },
    interactTag: 'cinema_preview',
  },
  {
    sku: 'table_wood',
    nameVi: 'Bàn gỗ uống trà',
    descriptionVi: 'Bàn nhỏ cùng tách trà ấm cho hai người.',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 2,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 1,
    sprite: { x: 112, y: 0, w: 32, h: 24 },
  },
  {
    sku: 'desk_study',
    nameVi: 'Bàn học yên tĩnh',
    descriptionVi: 'Góc học tập chung (Pomodoro không camera dự kiến mở ở V0.3).',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 2,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 1,
    sprite: { x: 144, y: 0, w: 32, h: 24 },
    interactTag: 'study_preview',
  },
  {
    sku: 'plant_monstera',
    nameVi: 'Chậu cây xanh',
    descriptionVi: 'Mang chút thiên nhiên vào trong căn nhà.',
    allowedMaps: ['home'],
    layerSlot: 'object',
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 3,
    sprite: { x: 32, y: 32, w: 16, h: 24 },
  },
  {
    sku: 'rug_peach',
    nameVi: 'Thảm đào dệt tay',
    descriptionVi: 'Đặt dưới bàn hoặc sofa để căn phòng thêm ấm cúng.',
    allowedMaps: ['home'],
    layerSlot: 'floor',
    widthTiles: 2,
    heightTiles: 2,
    blocksMovement: false,
    starterQuantity: 2,
    sprite: { x: 0, y: 32, w: 32, h: 32 },
  },
  {
    sku: 'bench_garden',
    nameVi: 'Ghế gỗ sân vườn',
    descriptionVi: 'Ghế ngồi ngắm hoa anh đào trong khu vườn.',
    allowedMaps: ['garden'],
    layerSlot: 'object',
    widthTiles: 2,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 2,
    sprite: { x: 176, y: 0, w: 32, h: 24 },
  },
  {
    sku: 'lantern_garden',
    nameVi: 'Đèn lồng đá vườn',
    descriptionVi: 'Chiếu sáng lối đi đá trong sân.',
    allowedMaps: ['garden'],
    layerSlot: 'object',
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 3,
    sprite: { x: 48, y: 32, w: 16, h: 24 },
  },
  {
    sku: 'flowerpot_sakura',
    nameVi: 'Chậu hoa anh đào',
    descriptionVi: 'Chậu hoa nhỏ tô điểm cho khu vườn.',
    allowedMaps: ['garden'],
    layerSlot: 'object',
    widthTiles: 1,
    heightTiles: 1,
    blocksMovement: true,
    starterQuantity: 3,
    sprite: { x: 64, y: 32, w: 16, h: 24 },
  },
] as const;

export const CATALOG_BY_SKU: ReadonlyMap<string, FurnitureCatalogItem> = new Map(
  STARTER_FURNITURE_CATALOG.map((item) => [item.sku, item]),
);

export function getCatalogItem(sku: string): FurnitureCatalogItem | undefined {
  return CATALOG_BY_SKU.get(sku);
}

export function getCatalogForMap(mapId: MapId): FurnitureCatalogItem[] {
  return STARTER_FURNITURE_CATALOG.filter((item) => item.allowedMaps.includes(mapId));
}

export interface DefaultPlacementSpec {
  mapId: MapId;
  sku: string;
  tileX: number;
  tileY: number;
}

export const DEFAULT_STARTER_PLACEMENT_SPECS: readonly DefaultPlacementSpec[] = [
  { mapId: 'home', sku: 'bed_cozy', tileX: 1, tileY: 3 },
  { mapId: 'home', sku: 'wardrobe_oak', tileX: 3, tileY: 3 },
  { mapId: 'home', sku: 'lamp_floor', tileX: 4, tileY: 3 },
  { mapId: 'home', sku: 'bookshelf_warm', tileX: 10, tileY: 3 },
  { mapId: 'home', sku: 'desk_study', tileX: 12, tileY: 3 },
  { mapId: 'home', sku: 'plant_monstera', tileX: 14, tileY: 3 },
  { mapId: 'home', sku: 'rug_peach', tileX: 5, tileY: 6 },
  { mapId: 'home', sku: 'sofa_cream', tileX: 5, tileY: 5 },
  { mapId: 'home', sku: 'table_wood', tileX: 10, tileY: 6 },
  { mapId: 'garden', sku: 'bench_garden', tileX: 4, tileY: 6 },
  { mapId: 'garden', sku: 'lantern_garden', tileX: 7, tileY: 5 },
  { mapId: 'garden', sku: 'flowerpot_sakura', tileX: 11, tileY: 4 },
];

export function buildDefaultStarterPlacements(
  worldId: string,
  ownerId: string,
  nowIso: string,
): FurniturePlacement[] {
  return DEFAULT_STARTER_PLACEMENT_SPECS.map((spec, index) => {
    const item = CATALOG_BY_SKU.get(spec.sku);
    if (!item) {
      throw new Error(`Missing catalog item for default spec: ${spec.sku}`);
    }
    return {
      id: `starter-${index + 1}-${spec.sku}`,
      worldId,
      mapId: spec.mapId,
      sku: spec.sku,
      layerSlot: item.layerSlot,
      tileX: spec.tileX,
      tileY: spec.tileY,
      widthTiles: item.widthTiles,
      heightTiles: item.heightTiles,
      updatedBy: ownerId,
      updatedAt: nowIso,
    };
  });
}
