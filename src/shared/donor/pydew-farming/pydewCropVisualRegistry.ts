import type { CropSku } from '../../farming/types';

export interface PydewCropVisual {
  readonly baseKey: 'donor-pydew-tomato';
  readonly displayScale: number;
  readonly ripeFrame: number;
}

/**
 * PyDew 64×64 fruit stages on native 64px farm tiles (artemn0va/pydew-valley).
 */
export const PYDEW_CROP_VISUALS: Partial<Record<CropSku, PydewCropVisual>> = {
  tomato: { baseKey: 'donor-pydew-tomato', ripeFrame: 3, displayScale: 1 },
};

export function pydewCropFrameTextureKey(baseKey: PydewCropVisual['baseKey'], frame: number): string {
  return `${baseKey}-${frame}`;
}

export function pydewCropVisual(cropSku: string): PydewCropVisual | null {
  return PYDEW_CROP_VISUALS[cropSku as CropSku] ?? null;
}

export function pydewGrowthFrame(cropSku: string, stage: number, ready: boolean): number {
  const vis = pydewCropVisual(cropSku);
  if (!vis) return 0;
  if (ready) return vis.ripeFrame;
  return Math.min(vis.ripeFrame, Math.max(0, stage));
}