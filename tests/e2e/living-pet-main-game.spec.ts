import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Living pet — main game DEV simulation', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('shows banner and pet in home when ?living-pet=1', async ({ page }) => {
    await page.goto('/?living-pet=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('living-pet-local-sim')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();
  });
});