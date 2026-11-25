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
  await page.waitForTimeout(500);
}

test.describe('Phase II — door/ladder env transition VQG', () => {
  test('home→garden door hook dataset + couple sync path', async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await seedCouple(pageA);
    await enterHome(pageA);
    await pageB.goto('/?vqg-capture=1');
    await pageB.getByTestId('preset-partner-b').click();
    await expect(pageB.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 30_000 });

    const canvasA = pageA.getByTestId('game-canvas-host').locator('canvas');
  const canvasB = pageB.getByTestId('game-canvas-host').locator('canvas');

    await canvasA.evaluate(() =>
      (globalThis as { __olwDevTravelPortal?: (id: string) => void }).__olwDevTravelPortal?.('door-to-garden'),
    );
    await expect
      .poll(async () => canvasA.evaluate((c) => c.dataset.envTransitionHook), { timeout: 15_000 })
      .toBe('home_garden_door');
    await expect
      .poll(async () => canvasA.evaluate((c) => c.dataset.envTransitionKind), { timeout: 15_000 })
      .toBe('door');

    await pageA.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-door-transition.png`, fullPage: true });

    await canvasB.evaluate(() =>
      (globalThis as { __olwDevTravelPortal?: (id: string) => void }).__olwDevTravelPortal?.('door-to-garden'),
    );
    await pageB.waitForTimeout(400);
    await expect
      .poll(async () => canvasB.evaluate((c) => c.dataset.envTransitionHook), { timeout: 15_000 })
      .toBe('home_garden_door');

    await canvasB.evaluate(() =>
      (globalThis as { __olwDevEnvTransition?: (id: string, kind: string) => void }).__olwDevEnvTransition?.(
        'village_forest_ladder',
        'ladder',
      ),
    );
    await expect
      .poll(async () => canvasB.evaluate((c) => c.dataset.envTransitionKind), { timeout: 10_000 })
      .toBe('ladder');
    await pageB.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-ladder-transition.png`, fullPage: true });

    await context.close();
  });
});