import type { CropSku } from '../../farming/types';

export interface CabacosCropVisual {
  readonly textureKey: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly ripeFrame: number;
}

/**
 * OLW authority crop SKU → Cabacos plantation spritesheet (MIT @ 79e423d).
 * Tomato/strawberry use nearest donor art until OLW catalog adds matching upstream crops.
 */
export const CABACOS_CROP_VISUALS: Partial<Record<CropSku, CabacosCropVisual>> = {
  wheat: { textureKey: 'donor-cabacos-wheat', frameWidth: 13, frameHeight: 16, ripeFrame: 3 },
  carrot: { textureKey: 'donor-cabacos-carrot', frameWidth: 12, frameHeight: 13, ripeFrame: 3 },
  sunflower: { textureKey: 'donor-cabacos-sunflower', frameWidth: 13, frameHeight: 19, ripeFrame: 3 },
  tomato: { textureKey: 'donor-cabacos-cabbage', frameWidth: 16, frameHeight: 13, ripeFrame: 3 },
  strawberry: { textureKey: 'donor-cabacos-beetroot', frameWidth: 16, frameHeight: 16, ripeFrame: 3 },
};

export function cabacosCropVisual(cropSku: string): CabacosCropVisual | null {
  return CABACOS_CROP_VISUALS[cropSku as CropSku] ?? null;
}