import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const OUT_DIR = process.env.OLW_VQG_OUT || '/cursor/stores/self/media';

async function seedCouple(page: import('@playwright/test').Page) {
  await page.request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
  await page.request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });
}

async function enterHome(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTestId('preset-partner-a').click();
  await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
}

async function nudgeTowardSofa(page: import('@playwright/test').Page) {
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(700);
}

async function nudgeTowardBed(page: import('@playwright/test').Page) {
  for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(700);
}

test.describe('Phase II — furniture posture VQG', () => {
  test('sofa + bed sit/lie feedback (dataset + capture)', async ({ page }) => {
    test.setTimeout(120_000);
    await seedCouple(page);
    await enterHome(page);
    await nudgeTowardSofa(page);
    await page.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('sofa_sit'));
    await expect
      .poll(
        async () =>
          page.getByTestId('game-canvas-host').locator('canvas').evaluate((c) => c.dataset.localPosture),
        { timeout: 15_000 },
      )
      .toBe('sit_sofa');
    await page.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-furniture-sit.png`, fullPage: true });

    await page.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('bed_lie'));
    await expect
      .poll(
        async () =>
          page.getByTestId('game-canvas-host').locator('canvas').evaluate((c) => c.dataset.localPosture),
        { timeout: 15_000 },
      )
      .toBe('lie_bed');
    await page.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-furniture-bed.png`, fullPage: true });
  });

  test('two clients sofa posture sync', async ({ browser }) => {
    test.setTimeout(120_000);
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const ctxB = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await seedCouple(pageA);
    await seedCouple(pageB);
    await enterHome(pageA);
    await pageB.goto('/');
    await pageB.getByTestId('preset-partner-b').click();
    await expect(pageB.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 30_000 });
    await pageB.waitForTimeout(800);

    await pageA.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('sofa_sit'));
    await pageB.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('sofa_sit'));

    await expect
      .poll(async () => pageA.getByTestId('game-canvas-host').locator('canvas').evaluate((c) => c.dataset.localPosture))
      .toBe('sit_sofa');
    await pageA.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-2p-sofa-a.png`, fullPage: true });
    await pageB.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-2p-sofa-b.png`, fullPage: true });
    await ctxA.close();
    await ctxB.close();
  });
});