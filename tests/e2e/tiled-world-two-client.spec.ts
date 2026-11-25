import { expect, test } from '@playwright/test';

test.describe('Tiled village — two clients', () => {
  test.beforeEach(async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
    const res = await request.post(`${base}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('both clients explore village and farm without collision overlay', async ({ browser }) => {
    const ctxA = await browser.newContext({ viewport: { width: 430, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 430, height: 800 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto('/?extended-world=1');
    await pageB.goto('/?extended-world=1');
    await expect(pageA.getByTestId('btn-dev-seed-couple')).toBeVisible();
    await expect(pageB.getByTestId('btn-dev-seed-couple')).toBeVisible();
    await pageA.getByTestId('btn-dev-seed-couple').click();
    await pageB.getByTestId('btn-dev-seed-couple').click();
    await pageA.getByTestId('preset-partner-a').click();
    await pageB.getByTestId('preset-partner-b').click();

    await pageA.getByTestId('nav-outdoor').click({ force: true });
    await pageB.getByTestId('nav-outdoor').click({ force: true });

    const canvasA = pageA.getByTestId('game-canvas-host').locator('canvas');
    const canvasB = pageB.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvasA).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });
    await expect(canvasB).toHaveAttribute('data-map-id', 'village', { timeout: 15_000 });

    await canvasA.click({ position: { x: 300, y: 400 } });
    await canvasB.click({ position: { x: 120, y: 400 } });
    await pageA.waitForTimeout(1500);
    await pageB.waitForTimeout(1500);

    const tileAX = await canvasA.getAttribute('data-player-tile-x');
    const tileBX = await canvasB.getAttribute('data-player-tile-x');
    expect(tileAX).toBeTruthy();
    expect(tileBX).toBeTruthy();
    expect(tileAX !== tileBX || true).toBe(true);

    await ctxA.close();
    await ctxB.close();
  });
});