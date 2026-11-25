import { cabacosCropVisual, type CabacosCropVisual } from './cabacos-79e423d/cropVisualRegistry';
import {
  pydewCropFrameTextureKey,
  pydewCropVisual,
  pydewGrowthFrame,
} from './pydew-farming/pydewCropVisualRegistry';

export type FarmCropRenderMode = 'cabacos_spritesheet' | 'pydew_image';

export interface ResolvedFarmCropVisual {
  mode: FarmCropRenderMode;
  textureKey: string;
  frame: number;
  displayScale: number;
}

export function resolveFarmCropVisual(
  cropSku: string,
  stage: number,
  ready: boolean,
): ResolvedFarmCropVisual | null {
  const pydew = pydewCropVisual(cropSku);
  if (pydew) {
    const frame = pydewGrowthFrame(cropSku, stage, ready);
    return {
      mode: 'pydew_image',
      textureKey: pydewCropFrameTextureKey(pydew.baseKey, frame),
      frame,
      displayScale: pydew.displayScale,
    };
  }
  const cab: CabacosCropVisual | null = cabacosCropVisual(cropSku);
  if (!cab) return null;
  const frame = ready ? cab.ripeFrame : Math.min(cab.ripeFrame, Math.max(0, stage));
  return {
    mode: 'cabacos_spritesheet',
    textureKey: cab.textureKey,
    frame,
    displayScale: 1,
  };
}