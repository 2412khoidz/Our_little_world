import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const OUT_DIR = process.env.OLW_VQG_OUT || '/cursor/stores/self/media';

async function seedCouple(page: import('@playwright/test').Page) {
  await page.request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
  await page.request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });
}

async function enterHome(page: import('@playwright/test').Page) {
  await page.goto('/?vqg-capture=1');
  await page.getByTestId('preset-partner-a').click();
  await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(400);
}

test.describe('Phase II — diagonal walk VQG', () => {
  test('facing8 diagonal walk clip (dataset + capture)', async ({ page }) => {
    test.setTimeout(90_000);
    await seedCouple(page);
    await enterHome(page);

    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.click();
    await page.keyboard.down('ArrowDown');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.evaluate(() =>
      (globalThis as { __olwDevSetFacing8?: (f: string) => void }).__olwDevSetFacing8?.('down-right'),
    );
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');

    await expect
      .poll(async () => canvas.evaluate((c) => c.dataset.localFacing8), { timeout: 10_000 })
      .toBe('down-right');

    await page.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-diagonal-walk.png`, fullPage: true });
  });
});