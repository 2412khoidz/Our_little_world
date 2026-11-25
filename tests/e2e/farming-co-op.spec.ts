import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Mission 05 — co-op farm (Dev LAN API)', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBeTruthy();
  });

  test('two clients share farm state with versioned apply', async ({ browser, request }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto('/');
    await pageA.getByTestId('btn-dev-seed-couple').click();
    await pageA.getByTestId('preset-partner-a').click();
    await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await pageB.goto('/');
    await pageB.getByTestId('preset-partner-b').click();

    const worldRes = await request.get(`${BASE}/api/dev-lan/world`);
    expect(worldRes.ok()).toBeTruthy();
    const worldJson = (await worldRes.json()) as { data?: { world?: { id?: string } } };
    const worldId = worldJson.data?.world?.id;
    expect(worldId).toBeTruthy();

    const farmA = await request.get(`${BASE}/farm?worldId=${worldId}`);
    expect(farmA.ok()).toBeTruthy();
  const snapA = (await farmA.json()) as { data: { version: number } };
    const v0 = snapA.data.version;

    const till = await request.post(`${BASE}/farm/apply`, {
      data: {
        worldId,
        plotIndex: 0,
        action: 'till',
        farmVersion: v0,
        idempotencyKey: 'e2e-till',
      },
    });
    expect(till.ok()).toBeTruthy();

    const farmB = await request.get(`${BASE}/farm?worldId=${worldId}`);
    const v1 = ((await farmB.json()) as { data: { version: number } }).data.version;
    expect(v1).toBeGreaterThan(v0);

    const stale = await request.post(`${BASE}/farm/apply`, {
      data: {
        worldId,
        plotIndex: 1,
        action: 'till',
        farmVersion: v0,
        idempotencyKey: 'e2e-stale',
      },
    });
    expect(stale.status()).toBe(409);

    const tillB = await request.post(`${BASE}/farm/apply`, {
      data: {
        worldId,
        plotIndex: 1,
        action: 'till',
        farmVersion: v1,
        idempotencyKey: 'e2e-till-b',
      },
    });
    expect(tillB.ok()).toBeTruthy();

    await pageA.getByTestId('nav-farm').click();
    await pageB.getByTestId('nav-farm').click();

    await ctxA.close();
    await ctxB.close();
  });
});