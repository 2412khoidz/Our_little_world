import type { AvatarConfig } from '../../shared/types';
import {
  PYDEW_CARDINAL_DIR,
  PYDEW_FARMER_ATLAS_FILES,
  PYDEW_FARMER_SHEET,
  pydewDonorAssetBasePath,
  pydewFrameIndex,
} from '../../shared/donor/pydewFarmerCharacterSheet';
import { donorGameplayTextureForConfig, DONOR_PYDEW_TEXTURE_IDS } from './donorPydewFarmerAvatarTexture';
import { USE_PRIVATE_ART } from './atlasProfile';

const TEXTURE_ID_TO_FILE: Record<string, string> = {
  [DONOR_PYDEW_TEXTURE_IDS.may]: PYDEW_FARMER_ATLAS_FILES.may,
  [DONOR_PYDEW_TEXTURE_IDS.nang]: PYDEW_FARMER_ATLAS_FILES.nang,
  [DONOR_PYDEW_TEXTURE_IDS.rose]: PYDEW_FARMER_ATLAS_FILES.rose,
};

const sheetCache = new Map<string, Promise<HTMLImageElement | null>>();

function sheetUrl(config: AvatarConfig): string {
  const textureId = donorGameplayTextureForConfig(config);
  const file = TEXTURE_ID_TO_FILE[textureId] ?? PYDEW_FARMER_ATLAS_FILES.may;
  const base = pydewDonorAssetBasePath(USE_PRIVATE_ART);
  return `${base}/${file}`;
}

/** Same PyDew farmer atlas + idle-down frame as Phaser `avatarIdleFrame`. */
export function loadDonorGameplayAvatarSheet(config: AvatarConfig): Promise<HTMLImageElement | null> {
  const url = sheetUrl(config);
  const cached = sheetCache.get(url);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
  sheetCache.set(url, promise);
  return promise;
}

export function drawDonorWardrobePreview(
  target: HTMLCanvasElement,
  sheet: HTMLImageElement,
  config: AvatarConfig,
  scale: number,
): void {
  const dir = PYDEW_CARDINAL_DIR.down;
  const frame = pydewFrameIndex(PYDEW_FARMER_SHEET.rows.idle, dir, 0);
  const col = frame % PYDEW_FARMER_SHEET.cols;
  const row = Math.floor(frame / PYDEW_FARMER_SHEET.cols);
  const { frameWidth: fw, frameHeight: fh } = PYDEW_FARMER_SHEET;
  const sx = col * fw;
  const sy = row * fh;
  target.width = fw * scale;
  target.height = fh * scale;
  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(sheet, sx, sy, fw, fh, 0, 0, target.width, target.height);
  target.dataset.donorTextureId = donorGameplayTextureForConfig(config);
}