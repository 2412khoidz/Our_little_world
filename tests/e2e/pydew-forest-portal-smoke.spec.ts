import { expect, test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || '4173'}`;

test.describe('PyDew forest portal smoke', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('VQG jump to forest after extended-world onboarding', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'portal smoke on desktop');
    await page.goto('/?extended-world=1&vqg-capture=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => window.__OLW_VQG?.jump?.('village', 42, 31));
    await expect(canvas).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });
    await page.evaluate(() => window.__OLW_VQG?.jump?.('forest', 8, 26));
    await expect(canvas).toHaveAttribute('data-map-id', 'forest', { timeout: 20_000 });
    await page.getByTestId('nav-outdoor').click({ force: true });
    await expect(canvas).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });
  });
});