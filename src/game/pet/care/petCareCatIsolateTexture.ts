/**
 * Isolated cat-orange + shadow spritesheets — one 16×16 cell visible (no full world-props bleed).
 */
import Phaser from 'phaser';
import { ART_ATLAS_PATH, USE_PRIVATE_ART } from '../../art/atlasProfile';
import { WORLD_PROPS_KEY, registerWorldAtlas } from '../../art/worldAtlas';
import extIds from '../../art/worldExtendedArtIds.json';
import {
  PET_CARE_CAT_SHEET_COLS,
  petCareCatFrameCrop,
  petCareCatSheetCols,
} from '../../../shared/petLiving/petCare/petCareAtlasFrameMath';

const WORLD_PROPS_MANIFEST = 'world-props-manifest';

export const PET_CARE_CAT_BODY_KEY = 'olw-pet-care-cat-body';
export const PET_CARE_CAT_SHADOW_KEY = 'olw-pet-care-cat-shadow';

const COLS = PET_CARE_CAT_SHEET_COLS;

interface PropsManifestEntry {
  id: string;
  rect: { x: number; y: number; w: number; h: number };
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}

function manifestEntry(
  scene: Phaser.Scene,
  semanticId: string,
): PropsManifestEntry | undefined {
  const data = scene.cache.json.get(WORLD_PROPS_MANIFEST) as { entries?: PropsManifestEntry[] } | undefined;
  return data?.entries?.find((e) => e.id === semanticId);
}

function sliceSheetFromParent(
  scene: Phaser.Scene,
  parentKey: string,
  outKey: string,
  semanticId: string,
): boolean {
  if (scene.textures.exists(outKey)) return true;
  const entry = manifestEntry(scene, semanticId);
  if (!entry?.frameWidth || !entry.frameHeight || !entry.rect) return false;
  const parent = scene.textures.get(parentKey);
  const source = parent.getSourceImage() as HTMLCanvasElement | HTMLImageElement | null;
  if (!source) return false;

  const { x, y, w, h } = entry.rect;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, x, y, w, h, 0, 0, w, h);

  const tex = scene.textures.addCanvas(outKey, canvas);
  if (!tex) return false;
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const fw = entry.frameWidth;
  const fh = entry.frameHeight;
  const count = entry.frameCount ?? 1;
  void petCareCatSheetCols(w, fw);
  for (let i = 0; i < count; i += 1) {
    const { x: cropX, y: cropY } = petCareCatFrameCrop(i, fw, fh, w);
    tex.add(i, 0, cropX, cropY, fw, fh);
  }
  return true;
}

/** Copy only the Frakassets cat rows from the unified props atlas into dedicated sprite sheets. */
export function ensurePetCareIsolatedCatSheets(scene: Phaser.Scene): boolean {
  if (scene.textures.exists(PET_CARE_CAT_BODY_KEY) && scene.textures.exists(PET_CARE_CAT_SHADOW_KEY)) {
    return true;
  }

  registerWorldAtlas(scene);

  if (!scene.textures.exists(WORLD_PROPS_KEY)) {
    return false;
  }

  const bodyOk = sliceSheetFromParent(scene, WORLD_PROPS_KEY, PET_CARE_CAT_BODY_KEY, extIds.sheets.cat_orange);
  const shadowOk = sliceSheetFromParent(
    scene,
    WORLD_PROPS_KEY,
    PET_CARE_CAT_SHADOW_KEY,
    extIds.sheets.cat_orange_shadow,
  );

  return bodyOk && shadowOk;
}

export function petCareCatBodyTextureKey(): string {
  return PET_CARE_CAT_BODY_KEY;
}

export function petCareCatShadowTextureKey(): string {
  return PET_CARE_CAT_SHADOW_KEY;
}

export function petCareCatFrameIndex(linearIndex: number): number {
  return linearIndex;
}

export function petCareAtlasProfileLabel(): string {
  return USE_PRIVATE_ART ? `private-unified (${ART_ATLAS_PATH})` : `unified-public (${ART_ATLAS_PATH})`;
}

export function catSheetColumns(): number {
  return COLS;
}