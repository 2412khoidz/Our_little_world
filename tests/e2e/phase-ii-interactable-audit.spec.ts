import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const OUT_DIR = process.env.OLW_VQG_OUT || '/cursor/stores/self/media';

async function seedCouple(page: import('@playwright/test').Page) {
  await page.request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
  await page.request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });
}

test.describe('Phase II interactable audit VQG', () => {
  test('home bowl use-item dataset + barn door hook', async ({ page }) => {
    test.setTimeout(90_000);
    await seedCouple(page);
    await page.goto('/?vqg-capture=1&extended-world=1');
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 30_000 });

    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.evaluate(() =>
      (globalThis as { __olwDevApplyHomeBowl?: (k: string) => void }).__olwDevApplyHomeBowl?.('food'),
    );
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.homeFoodBowl)).toBe('full');
    await page.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-bowl-food-fill.png`, fullPage: true });

    await page.getByTestId('nav-farm').click();
    await page.waitForTimeout(800);
    await canvas.evaluate(() =>
      (globalThis as { __olwDevEnvTransition?: (id: string, k: string) => void }).__olwDevEnvTransition?.(
        'farm_barn_door',
        'door',
      ),
    );
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.envTransitionHook)).toBe('farm_barn_door');
    await page.screenshot({ path: `${OUT_DIR}/vqg-phase-ii-barn-door.png`, fullPage: true });
  });
});