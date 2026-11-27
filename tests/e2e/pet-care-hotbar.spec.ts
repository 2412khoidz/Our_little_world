import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Pet care — hotbar & close-up', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('starter items are visible and claimed kibble can be bound to the hotbar', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('game-hotbar')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('game-hotbar').getByRole('button', { name: 'Cuốc gỗ' })).toBeVisible();
    await page.getByTestId('nav-menu').click({ force: true });
    await page.getByTestId('menu-inventory').click();
    await expect(page.getByTestId('nuvora-cell-fish_salmon_bite')).toHaveAttribute('data-item-qty', '2');
    await page.getByTestId('btn-claim-free-kibble').click();
    const kibble = page.getByTestId('nuvora-cell-pet_kibble_basic');
    await expect(kibble).toHaveAttribute('data-item-qty', '3');
    if (isMobile) {
      await kibble.tap();
      await page.getByTestId('btn-assign-hotbar-1').tap();
    } else {
      await kibble.click();
      await page.locator('[data-slot-kind="hotbar"][data-slot-index="0"]').click();
    }
    await expect(page.getByTestId('nuvora-hb-pet_kibble_basic')).toHaveAttribute('data-item-qty', '3');
    await page.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByTestId('game-hotbar').getByRole('button', { name: 'Hạt mèo cơ bản' })).toBeVisible();
  });
});