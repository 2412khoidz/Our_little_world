import type { AvatarConfig } from '../../shared/types';
import {
  COZY_PUNY_TEXTURE_FILES,
  PUNY_CARDINAL_DIR,
  PUNY_SHEET,
  punyDonorAssetBasePath,
  punyFrameIndex,
} from '../../shared/donor/punyCharacter8dSheet';
import { donorPunyTextureForConfig, DONOR_PUNY_TEXTURE_IDS } from './donorPunyAvatarTexture';
import { USE_PRIVATE_ART } from './atlasProfile';

const TEXTURE_ID_TO_FILE: Record<string, string> = {
  [DONOR_PUNY_TEXTURE_IDS.base]: COZY_PUNY_TEXTURE_FILES.base,
  [DONOR_PUNY_TEXTURE_IDS.mageCyan]: COZY_PUNY_TEXTURE_FILES.mageCyan,
  [DONOR_PUNY_TEXTURE_IDS.mageRed]: COZY_PUNY_TEXTURE_FILES.mageRed,
};

const sheetCache = new Map<string, Promise<HTMLImageElement | null>>();

function sheetUrl(config: AvatarConfig): string {
  const textureId = donorPunyTextureForConfig(config);
  const file = TEXTURE_ID_TO_FILE[textureId] ?? COZY_PUNY_TEXTURE_FILES.base;
  const base = punyDonorAssetBasePath(USE_PRIVATE_ART);
  return `${base}/${file}`;
}

/** Same donor sheet + idle-down frame index as Phaser `avatarIdleFrame` path. */
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
  const dir = PUNY_CARDINAL_DIR.down;
  const frame = punyFrameIndex(PUNY_SHEET.rows.idle, dir, 0);
  const col = frame % PUNY_SHEET.cols;
  const row = Math.floor(frame / PUNY_SHEET.cols);
  const { frameWidth: fw, frameHeight: fh } = PUNY_SHEET;
  const sx = col * fw;
  const sy = row * fh;
  target.width = fw * scale;
  target.height = fh * scale;
  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(sheet, sx, sy, fw, fh, 0, 0, target.width, target.height);
  target.dataset.donorTextureId = donorPunyTextureForConfig(config);
}