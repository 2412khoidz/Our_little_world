import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Pet care — hotbar & close-up', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('seed couple shows pet items on hotbar slots 1–5', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('game-hotbar')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('hotbar-slot-1').locator('svg')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('hotbar-slot-2').locator('svg')).toBeVisible();
    await page.getByTestId('nav-menu').click({ force: true });
    await page.getByTestId('menu-inventory').click();
    await page.getByTestId('btn-claim-free-kibble').click();
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.locator('.olw-hotbar-slot').filter({ hasText: '3' }).first()).toBeVisible();
  });
});