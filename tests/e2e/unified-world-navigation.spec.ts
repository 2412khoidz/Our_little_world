import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Unified world navigation (DEV)', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('home → garden → outdoor via portal and nav', async ({ page }) => {
    await page.goto('/?extended-world=1&collision-debug=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toBeVisible();

    await page.getByTestId('nav-garden').click({ force: true });
    await expect(canvas).toHaveAttribute('data-map-id', 'garden', { timeout: 15_000 });

    await page.getByTestId('nav-outdoor').click({ force: true });
    await expect(canvas).toHaveAttribute('data-map-id', 'outdoor', { timeout: 15_000 });
    expect(await canvas.getAttribute('data-map-id')).toBe('outdoor');
  });

  test('tap-to-move changes tile on outdoor', async ({ page }) => {
    await page.goto('/?extended-world=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-outdoor').click({ force: true });
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toHaveAttribute('data-map-id', 'outdoor', { timeout: 15_000 });

    const beforeX = await canvas.getAttribute('data-player-tile-x');
    const beforeY = await canvas.getAttribute('data-player-tile-y');
    await canvas.click({ position: { x: 380, y: 420 } });
    await page.waitForTimeout(1200);
    const afterX = await canvas.getAttribute('data-player-tile-x');
    const afterY = await canvas.getAttribute('data-player-tile-y');
    expect(afterX !== beforeX || afterY !== beforeY).toBe(true);
  });

  test('WASD moves avatar on outdoor (desktop)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'keyboard on desktop only');
    await page.goto('/?extended-world=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-outdoor').click({ force: true });
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toHaveAttribute('data-map-id', 'outdoor', { timeout: 15_000 });
    await canvas.click();
    const beforeX = await canvas.getAttribute('data-player-tile-x');
    await page.keyboard.down('d');
    await page.waitForTimeout(700);
    await page.keyboard.up('d');
    const afterX = await canvas.getAttribute('data-player-tile-x');
    expect(afterX).not.toBe(beforeX);
  });
});