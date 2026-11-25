import { expect, test, type Page } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

async function adoptPetQuyt(page: Page) {
  await page.getByTestId('nav-menu').click({ force: true });
  await page.getByTestId('menu-pet').click();
  await page.getByTestId('input-pet-name').fill('Quýt');
  await page.getByTestId('btn-pet-save-name').click();
  await page.getByRole('button', { name: 'Đóng' }).first().click();
}

test.describe('Pet care — close-up rig', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('living-pet care mode activates Phaser rig and call button', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/?living-pet=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('game-hotbar')).toBeVisible({ timeout: 25_000 });
    await adoptPetQuyt(page);
    await expect(page.getByTestId('living-pet-telemetry')).toHaveAttribute('data-visible', '1', { timeout: 25_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new Event('olw-dev-enter-pet-care'));
    });
    await expect(page.getByTestId('pet-care-overlay')).toBeVisible({ timeout: 20_000 });

    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.petCareRig === 'portrait')).toBe(true);
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.petCareJ4lpan === '1')).toBe(true);
    await expect(page.getByTestId('pet-care-j4lpan-portrait')).toBeVisible();
    await expect(page.getByTestId('pet-shop-closeup-cat')).toBeVisible();
    await expect(page.locator('[data-testid="pet-shop-closeup-cat"] svg')).toBeVisible();

    await page.getByTestId('pet-care-call').click();
    await page.getByTestId('pet-care-exit').click();
    await expect(page.getByTestId('pet-care-overlay')).toBeHidden({ timeout: 10_000 });
  });
});