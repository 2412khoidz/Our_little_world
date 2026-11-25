import { petCareCatFrameCrop } from '../petCare/petCareAtlasFrameMath';

/** Demo E / unified `world-props.png` — `sheet.cat_orange` atlas rect (see props-manifest.json). */
export const DONOR_CAT_ORANGE_SHEET = {
  atlasX: 0,
  atlasY: 192,
  sheetW: 192,
  sheetH: 256,
  frameW: 16,
  frameH: 16,
} as const;

export function donorCatOrangeFramePixels(frameIndex: number): {
  srcX: number;
  srcY: number;
  frameW: number;
  frameH: number;
} {
  const { x, y } = petCareCatFrameCrop(
    frameIndex,
    DONOR_CAT_ORANGE_SHEET.frameW,
    DONOR_CAT_ORANGE_SHEET.frameH,
    DONOR_CAT_ORANGE_SHEET.sheetW,
  );
  return {
    srcX: DONOR_CAT_ORANGE_SHEET.atlasX + x,
    srcY: DONOR_CAT_ORANGE_SHEET.atlasY + y,
    frameW: DONOR_CAT_ORANGE_SHEET.frameW,
    frameH: DONOR_CAT_ORANGE_SHEET.frameH,
  };
}