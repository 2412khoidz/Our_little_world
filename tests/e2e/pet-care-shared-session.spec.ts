import { expect, test } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${(process.env.PLAYWRIGHT_PORT || '4173')}`;

test.describe('Pet care — shared session RPC', () => {
  test('authoritative patch increments session revision', async ({ request }) => {
    test.setTimeout(60_000);
    await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    await request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });

    const snap = await request.get(`${BASE}/api/dev-lan/world/snapshot`, {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    const worldId = (await snap.json())?.data?.world?.id as string;
    expect(worldId).toBeTruthy();

    const patchRes = await request.post(`${BASE}/api/dev-lan/pet-care/session/patch`, {
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': '11111111-1111-4111-8111-111111111111',
      },
      data: {
        worldId,
        patch: {
          kind: 'stroke',
          zone: 'head',
          actorUserId: '11111111-1111-4111-8111-111111111111',
          atMs: Date.now(),
        },
      },
    });
    expect(patchRes.ok()).toBe(true);

    await expect
      .poll(
        async () => {
          const snap = await request.get(`${BASE}/api/dev-lan/world/snapshot`, {
            headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
          });
          const json = await snap.json();
          const worldId = json?.data?.world?.id as string;
          const sessionRes = await request.get(`${BASE}/api/dev-lan/pet-care/session?worldId=${worldId}`, {
            headers: { 'x-dev-user-id': '22222222-2222-4222-8222-222222222222' },
          });
          const sessionJson = await sessionRes.json();
          return sessionJson?.data?.revision ?? 0;
        },
        { timeout: 12_000 },
      )
      .toBeGreaterThan(0);
  });
});