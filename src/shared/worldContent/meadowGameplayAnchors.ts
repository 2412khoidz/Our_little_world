import type { WorldLandmark } from './extendedWorldLandmarks';

/** Compact main-game meadow slice (22×18 tiles) — not the sparse 64×64 sandbox. */
export const MEADOW_MAP_WIDTH_TILES = 22;
export const MEADOW_MAP_HEIGHT_TILES = 18;

export const MEADOW_MAIN_GAME_LANDMARKS: readonly WorldLandmark[] = [
  {
    id: 'picnic',
    nameVi: 'Bãi picnic hoa',
    tileX: 5,
    tileY: 8,
    radiusTiles: 3,
    biome: 'meadow',
    descriptionVi: 'Thảm len và giỏ bánh — chỗ nghỉ ngắn giữa vườn.',
  },
  {
    id: 'minigame_table',
    nameVi: 'Bàn mini-game',
    tileX: 11,
    tileY: 5,
    radiusTiles: 2,
    biome: 'meadow',
    descriptionVi: 'Bàn gỗ nhỏ cho caro và trò vui hai người (V0.2).',
  },
  {
    id: 'farm',
    nameVi: 'Luống rau mở rộng',
    tileX: 16,
    tileY: 7,
    radiusTiles: 3,
    biome: 'farm',
    descriptionVi: 'Hướng dương và rào gỗ — điểm neo farming V0.2.',
  },
  {
    id: 'fishing_pond',
    nameVi: 'Hồ câu nhỏ',
    tileX: 11,
    tileY: 13,
    radiusTiles: 4,
    biome: 'water',
    descriptionVi: 'Ao nước và cầu gỗ — neo fishing V0.2.',
  },
  {
    id: 'square',
    nameVi: 'Chợ Bác Hai (xem trước)',
    tileX: 4,
    tileY: 14,
    radiusTiles: 3,
    biome: 'town',
    descriptionVi: 'Gian hàng nhỏ — chưa mở giao dịch economy.',
  },
];