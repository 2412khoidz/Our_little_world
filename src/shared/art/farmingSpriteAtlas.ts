/**
 * Curated Packed Farming Sprite Atlases & Typed Lookup Helpers (Checkpoint G).
 *
 * Pure TypeScript (no React / Phaser / DOM imports) — usable in shared rules,
 * Vitest unit suites, React components (`CatalogSkuIcon.tsx`, `DonorWorkshopModal.tsx`),
 * and Phaser controllers (`BootScene.ts`, `FarmPlotVisualController.ts`, `OrchardVisualController.ts`).
 */
import atlasData from './farmingSpriteAtlas.generated.json';

export const FARMING_CROPS_ATLAS_KEY = 'olw-farming-crops-atlas';
export const FARMING_CROPS_ATLAS_PNG = '/assets/farming/crops-stages.png';
export const FARMING_CROPS_ATLAS_JSON = '/assets/farming/crops-stages.json';

export const FARMING_TREES_ATLAS_KEY = 'olw-farming-trees-atlas';
export const FARMING_TREES_ATLAS_PNG = '/assets/farming/trees-orchard.png';
export const FARMING_TREES_ATLAS_JSON = '/assets/farming/trees-orchard.json';

export const FARMING_LIVESTOCK_ATLAS_KEY = 'olw-farming-livestock-atlas';
export const FARMING_LIVESTOCK_ATLAS_PNG = '/assets/farming/livestock-ranch.png';
export const FARMING_LIVESTOCK_ATLAS_JSON = '/assets/farming/livestock-ranch.json';

export type FarmingAtlasId = 'items16' | 'items32';

export interface PackedItemSprite {
  readonly atlas: FarmingAtlasId;
  readonly url: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly sheetW: number;
  readonly sheetH: number;
  readonly donor: string;
}

export interface PackedSheetFrame {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly donor: string;
}

type RawItemEntry = {
  atlas: FarmingAtlasId;
  x: number;
  y: number;
  w: number;
  h: number;
  donor: string;
};

type RawStageRect = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type RawCropEntry = {
  donor: string;
  stages: RawStageRect[];
};

export interface LivestockAtlasSpec {
  readonly donor: string;
  readonly variant: string;
  readonly frameW: number;
  readonly frameH: number;
  readonly swarmFrameW?: number;
  readonly swarmFrameH?: number;
  readonly animations: Readonly<Record<string, readonly string[]>>;
  readonly sources: Readonly<Record<string, string>>;
}

const ITEMS_RECORD = atlasData.items as Record<string, RawItemEntry>;
const WORKSHOPS_RECORD = atlasData.workshops as Record<string, RawItemEntry>;
const CROPS_RECORD = atlasData.crops as Record<string, RawCropEntry>;
const TREES_RECORD = atlasData.trees as Record<string, Record<string, RawStageRect>>;
const LIVESTOCK_RECORD = (atlasData as { livestock?: Record<string, LivestockAtlasSpec> }).livestock ?? {};

function stripQualitySuffix(sku: string): string {
  const colon = sku.indexOf(':');
  return colon >= 0 ? sku.slice(0, colon) : sku;
}

function enrichItemEntry(raw: RawItemEntry | undefined): PackedItemSprite | null {
  if (!raw) return null;
  const sheet = atlasData.atlases[raw.atlas];
  return {
    atlas: raw.atlas,
    url: sheet.url,
    x: raw.x,
    y: raw.y,
    w: raw.w,
    h: raw.h,
    sheetW: sheet.w,
    sheetH: sheet.h,
    donor: raw.donor,
  };
}

export function getFarmingItemSprite(sku: string): PackedItemSprite | null {
  return enrichItemEntry(ITEMS_RECORD[stripQualitySuffix(sku)]);
}

export function getWorkshopMachineSprite(workshopId: string): PackedItemSprite | null {
  return enrichItemEntry(WORKSHOPS_RECORD[workshopId]);
}

export function getFarmingCropStageFrame(
  cropSku: string,
  stageIndex: number,
): PackedSheetFrame | null {
  const entry = CROPS_RECORD[stripQualitySuffix(cropSku)];
  if (!entry || entry.stages.length === 0) return null;
  const clamped = Math.max(0, Math.min(entry.stages.length - 1, Math.round(stageIndex)));
  const st = entry.stages[clamped];
  if (!st) return null;
  return {
    key: st.key,
    x: st.x,
    y: st.y,
    w: st.w,
    h: st.h,
    donor: entry.donor,
  };
}

export function getFarmingTreeFrame(
  treeId: string,
  stage: 'sapling' | 'young' | 'mature' | 'fruiting',
): PackedSheetFrame | null {
  const tree = TREES_RECORD[treeId];
  if (!tree) return null;
  const st = tree[stage];
  if (!st) return null;
  return {
    key: st.key,
    x: st.x,
    y: st.y,
    w: st.w,
    h: st.h,
    donor: 'lpc-fruit-trees',
  };
}

export interface SpriteBackgroundCss {
  width: number;
  height: number;
  backgroundImage: string;
  backgroundRepeat: 'no-repeat';
  backgroundPosition: string;
  backgroundSize: string;
  imageRendering: 'pixelated';
}

export function spriteBackgroundStyle(
  sprite: PackedItemSprite,
  renderSizePx: number,
): SpriteBackgroundCss {
  const scale = renderSizePx / Math.max(1, Math.max(sprite.w, sprite.h));
  const width = Math.max(1, Math.round(sprite.w * scale));
  const height = Math.max(1, Math.round(sprite.h * scale));
  const posX = -Math.round(sprite.x * scale);
  const posY = -Math.round(sprite.y * scale);
  const bgW = Math.round(sprite.sheetW * scale);
  const bgH = Math.round(sprite.sheetH * scale);
  return {
    width,
    height,
    backgroundImage: `url(${sprite.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `${posX}px ${posY}px`,
    backgroundSize: `${bgW}px ${bgH}px`,
    imageRendering: 'pixelated',
  };
}

export function getLivestockAtlasSpec(speciesId: string): LivestockAtlasSpec | null {
  return LIVESTOCK_RECORD[speciesId] ?? null;
}

export function getAllLivestockAtlasSpecs(): Readonly<Record<string, LivestockAtlasSpec>> {
  return LIVESTOCK_RECORD;
}

export function livestockAnimKey(speciesId: string, animName: string): string {
  return `olw-livestock-${speciesId}-${animName}`;
}

export const FARMING_SPRITE_ATLAS_META = {
  itemCount: Object.keys(ITEMS_RECORD).length,
  workshopCount: Object.keys(WORKSHOPS_RECORD).length,
  cropCount: Object.keys(CROPS_RECORD).length,
  treeCount: Object.keys(TREES_RECORD).length,
  livestockCount: Object.keys(LIVESTOCK_RECORD).length,
  atlases: atlasData.atlases,
} as const;
