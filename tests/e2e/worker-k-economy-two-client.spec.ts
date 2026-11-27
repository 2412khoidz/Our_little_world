import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const DEV_LAN = `${BASE}/api/dev-lan`;
const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';
const mayHeaders = { 'x-dev-user-id': MAY_ID, 'Content-Type': 'application/json' };
const nangHeaders = { 'x-dev-user-id': NANG_ID, 'Content-Type': 'application/json' };

test.describe('Worker K — buy / sell / shared inventory (two-client Dev LAN)', () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${DEV_LAN}/reset`, { data: {} });
    await request.post(`${DEV_LAN}/seed-couple`, { data: {} });
  });

  test('partner B sees wallet + inventory after A buys seed and sells crop', async ({ request }) => {
    const worldRes = await request.get(`${DEV_LAN}/world/snapshot`, { headers: mayHeaders });
    const worldId = ((await worldRes.json()) as { data?: { world?: { id?: string } } }).data?.world?.id;
    expect(worldId).toBeTruthy();
    const w = worldId!;

    const buy = await request.post(`${DEV_LAN}/farm/buy-seed`, {
      headers: mayHeaders,
      data: { worldId: w, seedSku: 'seed_carrot', qty: 2, idempotencyKey: 'wk-buy-1' },
    });
    expect(buy.ok()).toBeTruthy();

    const invB = await request.get(`${DEV_LAN}/inventory?worldId=${encodeURIComponent(w)}`, {
      headers: nangHeaders,
    });
    expect(invB.ok()).toBeTruthy();
    const rowsB = ((await invB.json()) as { data?: { items?: { itemSku: string; qty: number }[] } }).data?.items ?? [];
    const carrotSeedB = rowsB.find((r) => r.itemSku === 'seed_carrot');
    expect(carrotSeedB?.qty ?? 0).toBeGreaterThanOrEqual(2);

    await request.post(`${DEV_LAN}/dev-console/spawn-item`, {
      headers: mayHeaders,
      data: { worldId: w, scope: 'shared', itemSku: 'carrot', qty: 3, quality: 'normal' },
    });

    const sell = await request.post(`${DEV_LAN}/farm/sell`, {
      headers: mayHeaders,
      data: { worldId: w, sku: 'carrot', qty: 1, quality: 'normal', idempotencyKey: 'wk-sell-1' },
    });
    expect(sell.ok()).toBeTruthy();

    const farmB = await request.get(`${DEV_LAN}/farm?worldId=${encodeURIComponent(w)}`, {
      headers: nangHeaders,
    });
    const walletB = ((await farmB.json()) as { data?: { walletCoins?: number } }).data?.walletCoins;
    expect(walletB).toBeGreaterThan(0);

    const baitBuy = await request.post(`${DEV_LAN}/farm/buy-seed`, {
      headers: nangHeaders,
      data: { worldId: w, itemSku: 'bait_shrimp', qty: 1, idempotencyKey: 'wk-bait-1' },
    });
    expect(baitBuy.ok()).toBeTruthy();

    const invAfter = await request.get(`${DEV_LAN}/inventory?worldId=${encodeURIComponent(w)}`, {
      headers: mayHeaders,
    });
    const baitRow = (
      ((await invAfter.json()) as { data?: { items?: { itemSku: string }[] } }).data?.items ?? []
    ).find((r) => r.itemSku === 'bait_shrimp');
    expect(baitRow).toBeTruthy();
  });
});