import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Extended world — outdoor DEV preview (legacy spec)', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('shows banner and navigates to outdoor', async ({ page }) => {
    await page.goto('/?extended-world=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('extended-world-dev-preview')).toBeVisible();
    await expect(page.getByTestId('nav-outdoor')).toBeVisible();
    await page.getByTestId('nav-outdoor').click({ force: true });
    await expect(page.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'outdoor');
  });
});