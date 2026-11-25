/** Frakassets cat-orange isolated sheet: 12 frames per row (192÷16). */
export const PET_CARE_CAT_SHEET_COLS = 12;

export function petCareCatFrameCrop(
  frameIndex: number,
  frameWidth: number,
  frameHeight: number,
  sheetPixelWidth: number,
): { x: number; y: number } {
  const cols = Math.max(1, Math.floor(sheetPixelWidth / frameWidth));
  return {
    x: (frameIndex % cols) * frameWidth,
    y: Math.floor(frameIndex / cols) * frameHeight,
  };
}

export function petCareCatSheetCols(sheetPixelWidth: number, frameWidth: number): number {
  return Math.max(1, Math.floor(sheetPixelWidth / frameWidth));
}