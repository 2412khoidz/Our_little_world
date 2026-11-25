import fs from 'node:fs';
import { PNG } from 'pngjs';

/**
 * Sample a center band of a page screenshot for color diversity (not flat green void).
 * @param {string} pngPath
 */
export function assertScreenshotCenterVariance(pngPath, { minUnique = 24 } = {}) {
  const png = PNG.sync.read(fs.readFileSync(pngPath));
  const { width, height, data } = png;
  const x0 = Math.floor(width * 0.22);
  const y0 = Math.floor(height * 0.12);
  const x1 = Math.floor(width * 0.78);
  const y1 = Math.floor(height * 0.82);
  const colors = new Set();
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      const i = (width * y + x) * 4;
      const a = data[i + 3];
      if (a < 16) continue;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
  }
  if (colors.size < minUnique) {
    throw new Error(`Screenshot too flat (${colors.size} unique colors, need ≥${minUnique}): ${pngPath}`);
  }
  return colors.size;
}

/** @deprecated WebGL readPixels is unreliable across GPUs — prefer screenshot assert. */
export async function assertCanvasPixelVariance(page, options) {
  const tmp = `/tmp/olw-vqg-${Date.now()}.png`;
  await page.screenshot({ path: tmp, fullPage: false });
  try {
    return assertScreenshotCenterVariance(tmp, options);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}