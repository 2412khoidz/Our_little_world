import { expect, test, type Page } from '@playwright/test';

async function enterPetCare(page: Page) {
  await page.goto('/?living-pet=1&pet-care-illustration=0');
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
        page.getByTestId('game-canvas-host').locator('canvas').evaluate((c) => c.dataset.petCareAtlasIsolated),
      { timeout: 25_000 },
    )
    .toBe('1');
}

test.describe('Pet care — isolated cat atlas regression', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/dev-lan/reset', { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('isolated body texture is 192px wide with 16×16 frames (not full world-props)', async ({ page }) => {
    test.setTimeout(90_000);
    await enterPetCare(page);
    const metrics = await page.getByTestId('game-canvas-host').locator('canvas').evaluate((c) => ({
      frameW: Number(c.dataset.petCareBodyFrameW),
      frameH: Number(c.dataset.petCareBodyFrameH),
      texW: Number(c.dataset.petCareBodyTexW),
    }));
    expect(metrics.frameW).toBe(16);
    expect(metrics.frameH).toBe(16);
    expect(metrics.texW).toBeLessThanOrEqual(256);
    expect(metrics.texW).toBeGreaterThanOrEqual(128);
  });
});