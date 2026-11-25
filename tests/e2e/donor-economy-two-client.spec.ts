import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const DEV_LAN = `${BASE}/api/dev-lan`;
const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';
const mayHeaders = { 'x-dev-user-id': MAY_ID, 'Content-Type': 'application/json' };
const nangHeaders = { 'x-dev-user-id': NANG_ID, 'Content-Type': 'application/json' };

test.describe('Donor C1 — mill + pond + hollow + stream (two-client Dev LAN)', () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${DEV_LAN}/reset`, { data: {} });
    await request.post(`${DEV_LAN}/seed-couple`, { data: {} });
  });

  test('shared workshop queue + fishing + bakery bread + stream trout visible to both partners', async ({
    browser,
    request,
  }) => {
    const worldRes = await request.get(`${DEV_LAN}/world/snapshot`, { headers: mayHeaders });
    expect(worldRes.ok()).toBeTruthy();
    const worldId = ((await worldRes.json()) as { data?: { world?: { id?: string } } }).data?.world?.id;
    expect(worldId).toBeTruthy();
    const w = worldId!;

    await request.post(`${DEV_LAN}/dev-console/spawn-item`, {
      headers: mayHeaders,
      data: { worldId: w, scope: 'shared', itemSku: 'wheat', qty: 4 },
    });

    const queueA = await request.post(`${DEV_LAN}/donor/workshop/queue?worldId=${w}`, {
      headers: mayHeaders,
      data: { worldId: w, recipeId: 'olw_flour' },
    });
    expect(queueA.ok()).toBeTruthy();

    const workshopB = await request.get(`${DEV_LAN}/donor/workshop?worldId=${w}`, { headers: nangHeaders });
    expect(workshopB.ok()).toBeTruthy();
    const wJson = (await workshopB.json()) as { data?: { mill?: { queue?: unknown[] }; bakery?: { queue?: unknown[] } } };
    expect((wJson.data?.mill?.queue ?? []).length).toBeGreaterThanOrEqual(1);

    await request.post(`${DEV_LAN}/dev-console/spawn-item`, {
      headers: nangHeaders,
      data: { worldId: w, scope: 'shared', itemSku: 'flour', qty: 2 },
    });
    const breadQ = await request.post(`${DEV_LAN}/donor/bakery/queue?worldId=${w}`, {
      headers: nangHeaders,
      data: { worldId: w, recipeId: 'olw_bread' },
    });
    expect(breadQ.ok()).toBeTruthy();
    const bakeryAfter = await request.get(`${DEV_LAN}/donor/workshop?worldId=${w}`, { headers: mayHeaders });
    const bakeryQueue = ((await bakeryAfter.json()) as { data?: { bakery?: { queue?: unknown[] } } }).data?.bakery
      ?.queue ?? [];
    expect(bakeryQueue.length).toBeGreaterThanOrEqual(1);

    const fishStart = await request.post(`${DEV_LAN}/donor/fishing/start?worldId=${w}`, {
      headers: mayHeaders,
      data: { worldId: w, spotId: 'meadow_pond' },
    });
    expect(fishStart.ok()).toBeTruthy();

    const fishSessionB = await request.get(`${DEV_LAN}/donor/fishing/session?worldId=${w}`, { headers: nangHeaders });
    expect(fishSessionB.ok()).toBeTruthy();
    const sessJson = (await fishSessionB.json()) as { data?: { spotId?: string; phase?: string; previewName?: string } };
    expect(sessJson.data?.spotId).toBe('meadow_pond');
    expect(sessJson.data?.phase).toBe('casting');
    expect(sessJson.data?.previewName).toBeTruthy();

    const fishResolve = await request.post(`${DEV_LAN}/donor/fishing/resolve?worldId=${w}`, {
      headers: mayHeaders,
      data: { worldId: w, reelProgressPermille: 850 },
    });
    expect(fishResolve.ok()).toBeTruthy();
    expect(((await fishResolve.json()) as { data?: { itemSku?: string | null } }).data?.itemSku).toBeTruthy();

    const streamStart = await request.post(`${DEV_LAN}/donor/fishing/start?worldId=${w}`, {
      headers: nangHeaders,
      data: { worldId: w, spotId: 'east_stream' },
    });
    expect(streamStart.ok()).toBeTruthy();

    const streamResolve = await request.post(`${DEV_LAN}/donor/fishing/resolve?worldId=${w}`, {
      headers: nangHeaders,
      data: { worldId: w, reelProgressPermille: 920 },
    });
    expect(streamResolve.ok()).toBeTruthy();
    const streamSku = ((await streamResolve.json()) as { data?: { itemSku?: string | null } }).data?.itemSku;
    expect(streamSku === 'donor_trout_stream' || streamSku === 'carp_pond').toBeTruthy();

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    await pageA.goto('/');
    await pageA.getByTestId('preset-partner-a').click();
    await pageB.goto('/');
    await pageB.getByTestId('preset-partner-b').click();
    await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 25_000 });
    await expect(pageB.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 25_000 });

    await pageA.getByTestId('nav-menu').click();
    await expect(pageA.getByTestId('menu-donor-workshop')).toBeVisible();
    await pageA.getByTestId('menu-donor-workshop').click();
    await expect(pageA.getByTestId('donor-queue-bread')).toBeVisible();
    await pageA.getByRole('button', { name: 'Đóng' }).first().click();

    await ctxA.close();
    await ctxB.close();
  });
});