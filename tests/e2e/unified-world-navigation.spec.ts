import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Unified world navigation (DEV)', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('home → garden → village via nav', async ({ page }) => {
    await page.goto('/?extended-world=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toBeVisible();

    await page.getByTestId('nav-garden').click({ force: true });
    await expect(canvas).toHaveAttribute('data-map-id', 'garden', { timeout: 15_000 });

    await page.getByTestId('nav-outdoor').click({ force: true });
    await expect(canvas).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });
  });

  test('village west gate reaches farm map', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'long walk reliable on desktop keyboard');
    await page.goto('/?extended-world=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-outdoor').click({ force: true });
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });
    await canvas.click();
    await page.keyboard.down('w');
    await page.waitForTimeout(600);
    await page.keyboard.up('w');
    await page.keyboard.down('a');
    await page.waitForTimeout(5500);
    await page.keyboard.up('a');
    await expect(canvas).toHaveAttribute('data-map-id', 'farm', { timeout: 20_000 });
  });

  test('tap-to-move changes tile on village', async ({ page }) => {
    await page.goto('/?extended-world=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-outdoor').click({ force: true });
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });

    const beforeX = await canvas.getAttribute('data-player-tile-x');
    const beforeY = await canvas.getAttribute('data-player-tile-y');
    await canvas.click({ position: { x: 400, y: 360 } });
    await page.waitForTimeout(1200);
    const afterX = await canvas.getAttribute('data-player-tile-x');
    const afterY = await canvas.getAttribute('data-player-tile-y');
    expect(afterX !== beforeX || afterY !== beforeY).toBe(true);
  });

  test('WASD moves avatar on village (desktop)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'keyboard on desktop only');
    await page.goto('/?extended-world=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-outdoor').click({ force: true });
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });
    await canvas.click();
    const beforeX = await canvas.getAttribute('data-player-tile-x');
    await page.keyboard.down('d');
    await page.waitForTimeout(700);
    await page.keyboard.up('d');
    const afterX = await canvas.getAttribute('data-player-tile-x');
    expect(afterX).not.toBe(beforeX);
  });
});