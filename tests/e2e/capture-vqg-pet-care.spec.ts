import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const OUT_DIR =
  process.env.VQG_MEDIA_DIR ||
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media';

async function enterPetCare(page: Page) {
  await page.goto('/?living-pet=1');
  await page.getByTestId('btn-dev-seed-couple').click();
  await page.getByTestId('preset-partner-a').click();
  await expect(page.getByTestId('game-hotbar')).toBeVisible({ timeout: 25_000 });
  await page.getByTestId('nav-menu').click({ force: true });
  await page.getByTestId('menu-pet').click();
  await page.getByTestId('input-pet-name').fill('Quýt');
  await page.getByTestId('btn-pet-save-name').click();
  await page.getByRole('button', { name: 'Đóng' }).first().click();
  await expect(page.getByTestId('living-pet-telemetry')).toHaveAttribute('data-visible', '1', { timeout: 25_000 });
  await page.evaluate(() => window.dispatchEvent(new Event('olw-dev-enter-pet-care')));
  await expect(page.getByTestId('pet-care-overlay')).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      async () =>
        page.getByTestId('game-canvas-host').locator('canvas').evaluate((c) => c.dataset.petCareRig === 'portrait'),
      { timeout: 25_000 },
    )
    .toBe(true);
  await page.waitForTimeout(800);
}

test.describe('VQG capture — pet care', () => {
  test.skip(() => process.env.VQG_CAPTURE !== '1', 'Set VQG_CAPTURE=1');

  test.beforeEach(async ({ request }) => {
    mkdirSync(OUT_DIR, { recursive: true });
    const res = await request.post('/api/dev-lan/reset', { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('pet portrait + hotbar framing', async ({ page }) => {
    test.setTimeout(120_000);
    const tag = process.env.VQG_CAPTURE_TAG || 'after';
    await enterPetCare(page);
    await page.screenshot({ path: `${OUT_DIR}/vqg-pet-care-${tag}.png` });
    await page.getByTestId('pet-care-brush').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT_DIR}/vqg-pet-care-hotbar-${tag}.png` });
  });
});
