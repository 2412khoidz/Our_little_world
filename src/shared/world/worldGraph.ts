import { getMapTilePixelSize, type MapDefinition, type MapPortal } from '../maps';
import type { Direction, MapId } from '../types';

export type IslandBiome = 'indoor' | 'garden' | 'farm' | 'village' | 'forest' | 'beach' | 'shop';

export type PortalDirection = 'north' | 'south' | 'east' | 'west' | 'inside' | 'outside';

export interface IslandZoneMeta {
  readonly id: MapId;
  readonly nameVi: string;
  readonly subtitleVi: string;
  readonly biome: IslandBiome;
  readonly islandGrid: { readonly x: number; readonly y: number };
  readonly districtVi: string;
}

export interface CanonicalPortalEdge {
  readonly id: string;
  readonly from: MapId;
  readonly to: MapId;
  readonly reciprocalId: string;
  readonly direction: PortalDirection;
  readonly shortLabelVi: string;
  readonly arrivalFacing: Direction;
}

export const ISLAND_ZONES: Readonly<Record<MapId, IslandZoneMeta>> = {
  home: {
    id: 'home',
    nameVi: 'Trong nhà',
    subtitleVi: 'Mái ấm nhỏ của hai đứa',
    biome: 'indoor',
    islandGrid: { x: 1, y: 0 },
    districtVi: 'Đồi Hoa Mai',
  },
  garden: {
    id: 'garden',
    nameVi: 'Vườn nhà',
    subtitleVi: 'Khoảng sân yên bình trước hiên',
    biome: 'garden',
    islandGrid: { x: 1, y: 1 },
    districtVi: 'Đồi Hoa Mai',
  },
  farm: {
    id: 'farm',
    nameVi: 'Nông trại',
    subtitleVi: 'Đồng ruộng màu mỡ phía Tây',
    biome: 'farm',
    islandGrid: { x: 0, y: 1 },
    districtVi: 'Thung lũng Cỏ Mềm',
  },
  village: {
    id: 'village',
    nameVi: 'Làng Cabacos',
    subtitleVi: 'Quảng trường ven sông & khu chợ nhỏ',
    biome: 'village',
    islandGrid: { x: 1, y: 2 },
    districtVi: 'Trung tâm Đảo',
  },
  forest: {
    id: 'forest',
    nameVi: 'Rừng thông',
    subtitleVi: 'Rừng thông mát rượi phía Bắc Nông trại',
    biome: 'forest',
    islandGrid: { x: 0, y: 0 },
    districtVi: 'Rừng Bắc Thung lũng',
  },
  beach: {
    id: 'beach',
    nameVi: 'Vịnh Hải Âu',
    subtitleVi: 'Bãi cát vàng & cầu tàu phía Đông',
    biome: 'beach',
    islandGrid: { x: 2, y: 2 },
    districtVi: 'Bờ Đông Đảo',
  },
  shop: {
    id: 'shop',
    nameVi: 'Cửa hàng Bác Hai',
    subtitleVi: 'Vật tư & hạt giống nông trại',
    biome: 'shop',
    islandGrid: { x: 0, y: 1 },
    districtVi: 'Thung lũng Cỏ Mềm',
  },
  shop_seed: {
    id: 'shop_seed',
    nameVi: 'Tiệm Hạt Giống',
    subtitleVi: 'Hạt giống theo mùa & phân bón',
    biome: 'shop',
    islandGrid: { x: 1, y: 2 },
    districtVi: 'Làng Cabacos',
  },
  shop_tool: {
    id: 'shop_tool',
    nameVi: 'Tiệm Dụng Cụ',
    subtitleVi: 'Nông cụ & đồ nghề đảo nhỏ',
    biome: 'shop',
    islandGrid: { x: 1, y: 2 },
    districtVi: 'Làng Cabacos',
  },
  shop_crop_market: {
    id: 'shop_crop_market',
    nameVi: 'Chợ Nông Sản',
    subtitleVi: 'Thu mua nông sản & hải sản tươi',
    biome: 'shop',
    islandGrid: { x: 1, y: 2 },
    districtVi: 'Làng Cabacos',
  },
  shop_town_hall: {
    id: 'shop_town_hall',
    nameVi: 'Tòa Thị Chính',
    subtitleVi: 'Bảng tin & hồ sơ cư dân đảo',
    biome: 'shop',
    islandGrid: { x: 1, y: 2 },
    districtVi: 'Làng Cabacos',
  },
  outdoor: {
    id: 'outdoor',
    nameVi: 'Thế giới mở rộng',
    subtitleVi: 'Khu vực thử nghiệm',
    biome: 'garden',
    islandGrid: { x: 1, y: 1 },
    districtVi: 'Đảo nhỏ',
  },
};

export const CANONICAL_PORTAL_EDGES: readonly CanonicalPortalEdge[] = [
  // Home ↔ Garden
  {
    id: 'door-to-garden',
    from: 'home',
    to: 'garden',
    reciprocalId: 'cottage-to-home',
    direction: 'south',
    shortLabelVi: 'Ra Vườn nhà',
    arrivalFacing: 'down',
  },
  {
    id: 'cottage-to-home',
    from: 'garden',
    to: 'home',
    reciprocalId: 'door-to-garden',
    direction: 'inside',
    shortLabelVi: 'Trong nhà',
    arrivalFacing: 'up',
  },
  // Garden ↔ Farm (west path)
  {
    id: 'garden-to-farm',
    from: 'garden',
    to: 'farm',
    reciprocalId: 'farm-to-garden',
    direction: 'west',
    shortLabelVi: 'Nông trại',
    arrivalFacing: 'left',
  },
  {
    id: 'farm-to-garden',
    from: 'farm',
    to: 'garden',
    reciprocalId: 'garden-to-farm',
    direction: 'east',
    shortLabelVi: 'Vườn nhà',
    arrivalFacing: 'right',
  },
  // Garden ↔ Village (south bridge <-> north causeway bridge plaza)
  {
    id: 'garden-to-village',
    from: 'garden',
    to: 'village',
    reciprocalId: 'village-to-garden',
    direction: 'south',
    shortLabelVi: 'Làng Cabacos',
    arrivalFacing: 'down',
  },
  {
    id: 'village-to-garden',
    from: 'village',
    to: 'garden',
    reciprocalId: 'garden-to-village',
    direction: 'north',
    shortLabelVi: 'Vườn nhà',
    arrivalFacing: 'up',
  },
  // Farm ↔ Forest (farm north dirt road <-> forest south trail)
  {
    id: 'farm-to-forest',
    from: 'farm',
    to: 'forest',
    reciprocalId: 'forest-to-farm',
    direction: 'north',
    shortLabelVi: 'Rừng thông',
    arrivalFacing: 'up',
  },
  {
    id: 'forest-to-farm',
    from: 'forest',
    to: 'farm',
    reciprocalId: 'farm-to-forest',
    direction: 'south',
    shortLabelVi: 'Nông trại',
    arrivalFacing: 'down',
  },
  // Village ↔ Beach (east wooden harbor pier)
  {
    id: 'village-to-beach',
    from: 'village',
    to: 'beach',
    reciprocalId: 'beach-to-village',
    direction: 'east',
    shortLabelVi: 'Bãi biển',
    arrivalFacing: 'right',
  },
  {
    id: 'beach-to-village',
    from: 'beach',
    to: 'village',
    reciprocalId: 'village-to-beach',
    direction: 'west',
    shortLabelVi: 'Làng Cabacos',
    arrivalFacing: 'left',
  },
  // Village ↔ Shops / Town Hall
  {
    id: 'village-to-shop-seed',
    from: 'village',
    to: 'shop_seed',
    reciprocalId: 'shop-seed-to-village',
    direction: 'inside',
    shortLabelVi: 'Tiệm Hạt Giống',
    arrivalFacing: 'up',
  },
  {
    id: 'shop-seed-to-village',
    from: 'shop_seed',
    to: 'village',
    reciprocalId: 'village-to-shop-seed',
    direction: 'outside',
    shortLabelVi: 'Ra làng',
    arrivalFacing: 'down',
  },
  {
    id: 'village-to-shop-tool',
    from: 'village',
    to: 'shop_tool',
    reciprocalId: 'shop-tool-to-village',
    direction: 'inside',
    shortLabelVi: 'Tiệm Dụng Cụ',
    arrivalFacing: 'up',
  },
  {
    id: 'shop-tool-to-village',
    from: 'shop_tool',
    to: 'village',
    reciprocalId: 'village-to-shop-tool',
    direction: 'outside',
    shortLabelVi: 'Ra làng',
    arrivalFacing: 'down',
  },
  {
    id: 'village-to-shop-crop-market',
    from: 'village',
    to: 'shop_crop_market',
    reciprocalId: 'shop-crop-market-to-village',
    direction: 'inside',
    shortLabelVi: 'Chợ Nông Sản',
    arrivalFacing: 'up',
  },
  {
    id: 'shop-crop-market-to-village',
    from: 'shop_crop_market',
    to: 'village',
    reciprocalId: 'village-to-shop-crop-market',
    direction: 'outside',
    shortLabelVi: 'Ra làng',
    arrivalFacing: 'down',
  },
  {
    id: 'village-to-shop-town-hall',
    from: 'village',
    to: 'shop_town_hall',
    reciprocalId: 'shop-town-hall-to-village',
    direction: 'inside',
    shortLabelVi: 'Tòa Thị Chính',
    arrivalFacing: 'up',
  },
  {
    id: 'shop-town-hall-to-village',
    from: 'shop_town_hall',
    to: 'village',
    reciprocalId: 'village-to-shop-town-hall',
    direction: 'outside',
    shortLabelVi: 'Ra làng',
    arrivalFacing: 'down',
  },
];

const EDGE_BY_ID = new Map<string, CanonicalPortalEdge>(
  CANONICAL_PORTAL_EDGES.map((e) => [e.id, e]),
);

export function getIslandZoneMeta(mapId: MapId): IslandZoneMeta {
  return ISLAND_ZONES[mapId] ?? ISLAND_ZONES.home;
}

export function getCanonicalPortalEdge(portalId: string): CanonicalPortalEdge | null {
  return EDGE_BY_ID.get(portalId) ?? null;
}

export function getPortalDirectionArrow(dir: PortalDirection): string {
  switch (dir) {
    case 'north':
      return '↑';
    case 'south':
      return '↓';
    case 'east':
      return '→';
    case 'west':
      return '←';
    case 'inside':
      return '⌂';
    case 'outside':
      return '↳';
  }
}

export function getPortalShortLabelVi(portalId: string, fallbackLabelVi: string): string {
  const edge = getCanonicalPortalEdge(portalId);
  if (!edge) return fallbackLabelVi;
  return `${getPortalDirectionArrow(edge.direction)} ${edge.shortLabelVi}`;
}

export function getArrivalFacingForPortal(portalId: string | undefined): Direction | null {
  if (!portalId) return null;
  return getCanonicalPortalEdge(portalId)?.arrivalFacing ?? null;
}

export function validateWorldGraphReciprocity(
  getMapDef: (id: MapId) => MapDefinition,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const edge of CANONICAL_PORTAL_EDGES) {
    const srcDef = getMapDef(edge.from);
    const dstDef = getMapDef(edge.to);
    const portal: MapPortal | undefined = srcDef.portals.find((p) => p.id === edge.id);
    if (!portal) {
      errors.push(`Missing portal '${edge.id}' on map '${edge.from}'`);
      continue;
    }
    if (portal.targetMapId !== edge.to) {
      errors.push(`Portal '${edge.id}' targets '${portal.targetMapId}', expected '${edge.to}'`);
    }
    if (srcDef.isStaticBlocked(portal.tileX, portal.tileY)) {
      errors.push(
        `Portal '${edge.id}' on '${edge.from}' at (${portal.tileX},${portal.tileY}) is blocked`,
      );
    }
    if (
      portal.targetSpawnX < 0 ||
      portal.targetSpawnY < 0 ||
      portal.targetSpawnX >= dstDef.widthTiles ||
      portal.targetSpawnY >= dstDef.heightTiles
    ) {
      errors.push(
        `Portal '${edge.id}' spawn (${portal.targetSpawnX},${portal.targetSpawnY}) out of bounds on '${edge.to}'`,
      );
      continue;
    }
    if (dstDef.isStaticBlocked(portal.targetSpawnX, portal.targetSpawnY)) {
      errors.push(
        `Portal '${edge.id}' spawn (${portal.targetSpawnX},${portal.targetSpawnY}) on '${edge.to}' is blocked`,
      );
    }
    const reciprocal = dstDef.portals.find((p) => p.id === edge.reciprocalId);
    if (!reciprocal) {
      errors.push(`Missing reciprocal portal '${edge.reciprocalId}' on '${edge.to}'`);
      continue;
    }
    if (reciprocal.targetMapId !== edge.from) {
      errors.push(
        `Reciprocal portal '${edge.reciprocalId}' targets '${reciprocal.targetMapId}', expected '${edge.from}'`,
      );
    }
    const clearance = Math.hypot(
      portal.targetSpawnX - reciprocal.tileX,
      portal.targetSpawnY - reciprocal.tileY,
    );
    if (clearance < 1.1) {
      errors.push(
        `Portal '${edge.id}' spawns (${portal.targetSpawnX},${portal.targetSpawnY}) too close (${clearance.toFixed(2)} tiles) to return portal '${reciprocal.id}' (${reciprocal.tileX},${reciprocal.tileY})`,
      );
    }
    // Check tile size consistency sanity
    void getMapTilePixelSize(edge.from);
  }

  return { ok: errors.length === 0, errors };
}
