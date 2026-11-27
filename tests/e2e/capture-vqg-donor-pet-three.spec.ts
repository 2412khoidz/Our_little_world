import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const OUT_DIR = process.env.VQG_MEDIA_DIR || '/cursor/stores/self/media';
const BG = { r: 26, g: 18, b: 24 };

async function sampleCanvasCenter(page: import('@playwright/test').Page) {
  return page.evaluate(({ bg }) => {
    const canvas = document.querySelector('canvas[data-testid="donor-pet-three-canvas"]') as HTMLCanvasElement | null;
    if (!canvas || canvas.width < 16 || canvas.height < 16) {
      return { ok: false, reason: 'missing-or-zero-canvas', w: canvas?.width ?? 0, h: canvas?.height ?? 0 };
    }
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext('2d');
    if (!ctx) return { ok: false, reason: 'no-2d' };
    try {
      ctx.drawImage(canvas, 0, 0);
    } catch {
      return { ok: false, reason: 'webgl-draw-failed' };
    }
    const probes = [
      [0.5, 0.46],
      [0.5, 0.5],
      [0.48, 0.44],
      [0.52, 0.48],
    ] as const;
    let best = { dist: 0, hit: { r: 0, g: 0, b: 0, a: 0 } };
    for (const [nx, ny] of probes) {
      const cx = Math.floor(canvas.width * nx);
      const cy = Math.floor(canvas.height * ny);
      const d = ctx.getImageData(cx, cy, 1, 1).data;
      const hit = { r: d[0] ?? 0, g: d[1] ?? 0, b: d[2] ?? 0, a: d[3] ?? 0 };
      const distBg = Math.abs(hit.r - bg.r) + Math.abs(hit.g - bg.g) + Math.abs(hit.b - bg.b);
      if (distBg > best.dist) best = { dist: distBg, hit };
    }
    const nonEmpty = best.hit.a > 0 && best.dist > 18;
    return { ok: nonEmpty, hit: best.hit, ready: canvas.dataset.donorCatReady, w: canvas.width, h: canvas.height };
  }, { bg: BG });
}

test.describe('VQG capture — donor Three.js care', () => {
  test.skip(() => process.env.VQG_CAPTURE !== '1', 'Set VQG_CAPTURE=1');

  test('donor-pet-three licensed cat visible + stroke shifts pixels', async ({ page }) => {
    mkdirSync(OUT_DIR, { recursive: true });
    await page.goto('/?donor-pet-care=1');
    await expect(page.getByTestId('donor-pet-three-care')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('donor-pet-three-stage')).toBeVisible();
    await expect
      .poll(async () => page.locator('canvas[data-testid="donor-pet-three-canvas"]').getAttribute('data-donor-cat-ready'), {
        timeout: 20_000,
      })
      .toBe('1');

    await page.waitForTimeout(400);
    const before = await sampleCanvasCenter(page);
    expect(before.ok, JSON.stringify(before)).toBeTruthy();
    expect((before.w ?? 0) >= 280).toBeTruthy();
    expect((before.h ?? 0) >= 280).toBeTruthy();

    const stage = page.getByTestId('donor-pet-three-stage');
    const box = await stage.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      const cx = box.x + box.width * 0.5;
      const cy = box.y + box.height * 0.48;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 24, cy + 16, { steps: 10 });
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    const after = await sampleCanvasCenter(page);
    expect(after.ok, JSON.stringify(after)).toBeTruthy();

    const strokeChanged =
      before.hit && after.hit
        ? before.hit.r !== after.hit.r || before.hit.g !== after.hit.g || before.hit.b !== after.hit.b
        : false;
    await page.getByRole('button', { name: 'Gọi' }).click();
    await page.waitForTimeout(500);
    const afterCall = await sampleCanvasCenter(page);
    expect(afterCall.ok).toBeTruthy();
    const interactionProof =
      strokeChanged ||
      (before.hit &&
        afterCall.hit &&
        (afterCall.hit.r !== before.hit.r || afterCall.hit.g !== before.hit.g || afterCall.hit.b !== before.hit.b));
    expect(interactionProof, 'stroke or call should shift canvas pixels').toBeTruthy();

    await page.screenshot({ path: `${OUT_DIR}/vqg-donor-pet-three-c2.png`, fullPage: true });
    writeFileSync(
      `${OUT_DIR}/vqg-donor-pet-three-capture-meta.json`,
      JSON.stringify({ before, after, strokeChanged }, null, 2),
    );
  });
});