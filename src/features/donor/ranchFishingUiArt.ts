import { ranchFishingFrame, RANCH_FISHING_URL } from '../../shared/art/ranchActionAtlas';
import { resolveCanonicalFishByCritterId } from '../../shared/donor/fishing/canonicalFishRegistry';

export const RANCH_MINNOW_LEGACY_URL = resolveCanonicalFishByCritterId('minnow').spriteUrl;

export interface RanchFishingUiArt {
  ranch: HTMLImageElement;
  waterTile: HTMLCanvasElement;
}

let artPromise: Promise<RanchFishingUiArt> | undefined;
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Chưa tải được hình ảnh câu cá.'));
    img.src = url;
  });
}

export function loadRanchFishingUiArt(): Promise<RanchFishingUiArt> {
  artPromise ??= loadImage(RANCH_FISHING_URL).then((ranch) => {
    const { x, y, w, h } = ranchFishingFrame('panel_water');
    const waterTile = document.createElement('canvas');
    waterTile.width = w * 2;
    waterTile.height = h * 2;
    const ctx = waterTile.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(ranch, x, y, w, h, 0, 0, w * 2, h * 2);
    }
    return { ranch, waterTile };
  }).catch((error: unknown) => {
    artPromise = undefined;
    throw error;
  });
  return artPromise;
}
