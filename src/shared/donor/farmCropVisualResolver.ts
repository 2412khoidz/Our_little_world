import { cabacosCropVisual, type CabacosCropVisual } from './cabacos-79e423d/cropVisualRegistry';
import {
  pydewCropFrameTextureKey,
  pydewCropVisual,
  pydewGrowthFrame,
} from './pydew-farming/pydewCropVisualRegistry';
import { getDeepCropDefinition } from '../farming/deepCropSimulation';
import { FARMING_CROPS_ATLAS_KEY, getFarmingCropStageFrame } from '../art/farmingSpriteAtlas';

export type FarmCropRenderMode =
  | 'farming_atlas'
  | 'cabacos_spritesheet'
  | 'pydew_image'
  | 'procedural_crop';

export interface ResolvedFarmCropVisual {
  mode: FarmCropRenderMode;
  textureKey: string;
  frame: number;
  frameKey?: string;
  frameWidthPx?: number;
  frameHeightPx?: number;
  displayScale: number;
}

/**
 * Computes consistent sprite scale relative to the rendered map `tilePixelSize` (16px canonical).
 * Keeps crops strictly bounded to plot proportions and smaller than the cozy avatar (~24px tall).
 */
export function computeFarmCropDisplayScale(
  frameW: number,
  frameH: number,
  tilePixelSize = 16,
): number {
  const safeW = Math.max(1, frameW);
  const safeH = Math.max(1, frameH);
  const tileUnit = tilePixelSize / 16;
  if (safeW <= 16 && safeH <= 16) {
    return 1.0 * tileUnit;
  }
  if (safeW <= 16) {
    // 16x32 tall crops: fit cleanly inside plot width while rising smoothly (~27px on 16px tile)
    return 0.85 * tileUnit;
  }
  // 32x36 donor crops: normalize to ~17px width (~19px height on 16px tile) so they never dwarf avatars
  return (17 / safeW) * tileUnit;
}

export function resolveFarmCropVisual(
  cropSku: string,
  stage: number,
  ready: boolean,
  tilePixelSize = 16,
): ResolvedFarmCropVisual | null {
  const packedStage = getFarmingCropStageFrame(cropSku, ready ? 3 : stage);
  if (packedStage) {
    return {
      mode: 'farming_atlas',
      textureKey: FARMING_CROPS_ATLAS_KEY,
      frame: 0,
      frameKey: packedStage.key,
      frameWidthPx: packedStage.w,
      frameHeightPx: packedStage.h,
      displayScale: computeFarmCropDisplayScale(packedStage.w, packedStage.h, tilePixelSize),
    };
  }
  const pydew = pydewCropVisual(cropSku);
  if (pydew) {
    const frame = pydewGrowthFrame(cropSku, stage, ready);
    return {
      mode: 'pydew_image',
      textureKey: pydewCropFrameTextureKey(pydew.baseKey, frame),
      frame,
      displayScale: pydew.displayScale * (tilePixelSize / 16),
    };
  }
  const cab: CabacosCropVisual | null = cabacosCropVisual(cropSku);
  if (cab) {
    const frame = ready ? cab.ripeFrame : Math.min(cab.ripeFrame, Math.max(0, stage));
    return {
      mode: 'cabacos_spritesheet',
      textureKey: cab.textureKey,
      frame,
      displayScale: 1 * (tilePixelSize / 16),
    };
  }
  if (getDeepCropDefinition(cropSku)) {
    const safeStage = ready ? 3 : Math.max(0, Math.min(3, stage));
    return {
      mode: 'procedural_crop',
      textureKey: `olw-proc-crop-${cropSku}-s${safeStage}`,
      frame: 0,
      displayScale: 1 * (tilePixelSize / 16),
    };
  }
  return null;
}
