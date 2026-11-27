import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const DEV_LAN = `${BASE}/api/dev-lan`;
const MAY_ID = '11111111-1111-4111-8111-111111111111';

test.describe('MISSION NET.1 — Two-client WebSocket multiplayer, diagnostics & recovery', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${DEV_LAN}/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('connects over WebSocket, displays live diagnostics, recovers from offline/reconnect, and syncs map/state', async ({
    browser,
    request,
  }) => {
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const errors: string[] = [];

    try {
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();
      pageA.on('pageerror', (e) => errors.push(`A:${e.message}`));
      pageB.on('pageerror', (e) => errors.push(`B:${e.message}`));

      await pageA.goto('/');
      await pageA.getByTestId('btn-dev-seed-couple').click();
      await pageA.getByTestId('preset-partner-a').click();
      await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'home');

      await pageB.goto('/');
      await pageB.getByTestId('preset-partner-b').click();
      await expect(pageB.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'home');

      // Open diagnostics overlay on both clients
      await pageA.getByTestId('connection-pill').click();
      await pageB.getByTestId('connection-pill').click();

      await expect(pageA.getByTestId('network-diagnostics-overlay')).toBeVisible();
      await expect(pageB.getByTestId('network-diagnostics-overlay')).toBeVisible();

      await expect(pageA.getByTestId('diag-status')).toHaveText('Connected');
      await expect(pageB.getByTestId('diag-status')).toHaveText('Connected');
      await expect(pageA.getByTestId('diag-transport')).toHaveText('WS');
      await expect(pageB.getByTestId('diag-transport')).toHaveText('WS');
      await expect(pageA.getByTestId('diag-players')).toHaveText('2/2');
      await expect(pageB.getByTestId('diag-players')).toHaveText('2/2');
      await expect(pageA.getByTestId('diag-rtt')).toContainText('ms');
      await expect(pageB.getByTestId('diag-rtt')).toContainText('ms');
      await expect(pageA.getByTestId('diag-remote')).toContainText('home (On map)');
      await expect(pageB.getByTestId('diag-remote')).toContainText('home (On map)');

      // Map transition sync: Mây moves to garden, Nắng sees update and follows
      await pageA.getByTestId('nav-garden').click();
      await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'garden');
      await expect(pageB.getByTestId('partner-presence-pill')).toContainText('Ngoài vườn');
      await expect(pageB.getByTestId('diag-remote')).toContainText('garden (Other)');

      await pageB.getByTestId('nav-garden').click();
      await expect(pageB.getByTestId('diag-remote')).toContainText('garden (On map)');
      await expect(pageA.getByTestId('diag-remote')).toContainText('garden (On map)');

      // Network drop & automatic recovery on client B (simulating mobile transition)
      await ctxB.setOffline(true);
      await expect(pageB.getByTestId('diag-status')).toHaveText(/Offline|Reconnecting/);
      await ctxB.setOffline(false);

      await expect(pageB.getByTestId('diag-status')).toHaveText('Connected', { timeout: 10_000 });
      await expect(pageB.getByTestId('diag-players')).toHaveText('2/2');
      await expect(pageB.getByTestId('diag-local')).toContainText('garden');
      await expect(pageB.getByTestId('diag-remote')).toContainText('garden (On map)');

      // Authoritative state version sync across both clients via server farm mutation
      const stateBeforeB = Number(await pageB.getByTestId('diag-state-version').textContent());
      const worldSnap = await request.get(`${DEV_LAN}/world/snapshot`, {
        headers: { 'x-dev-user-id': MAY_ID },
      });
      const worldId = ((await worldSnap.json()) as { data: { world: { id: string } } }).data.world.id;
      const farmSnapRes = await request.get(`${DEV_LAN}/farm?worldId=${worldId}`, {
        headers: { 'x-dev-user-id': MAY_ID },
      });
      const farmVer = ((await farmSnapRes.json()) as { data: { version: number } }).data.version;
      const tillRes = await request.post(`${DEV_LAN}/farm/apply`, {
        headers: { 'x-dev-user-id': MAY_ID },
        data: {
          worldId,
          plotIndex: 0,
          action: 'till',
          farmVersion: farmVer,
          idempotencyKey: 'e2e-net1-till-0',
        },
      });
      expect(tillRes.ok()).toBe(true);

      await expect
        .poll(async () => Number(await pageB.getByTestId('diag-state-version').textContent()))
        .toBeGreaterThan(stateBeforeB);
      await expect
        .poll(async () => Number(await pageA.getByTestId('diag-state-version').textContent()))
        .toBeGreaterThan(stateBeforeB);

      expect(errors).toEqual([]);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('NET.1.1: clean mobile browser opens /__share/<token> on 1/2 host world, auto-joins as Nắng, connects WS, and preserves session on reload', async ({
    browser,
    request,
  }) => {
    const ctxHost = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxPhone = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const errors: string[] = [];

    try {
      const pageHost = await ctxHost.newPage();
      const pagePhone = await ctxPhone.newPage();
      pageHost.on('pageerror', (e) => errors.push(`Host:${e.message}`));
      pagePhone.on('pageerror', (e) => errors.push(`Phone:${e.message}`));

      // 1. Mây creates a fresh 1/2 world manually (NOT pre-seeded couple) and enters home
      await pageHost.goto('/');
      await pageHost.getByTestId('preset-partner-a').click();
      await pageHost.getByTestId('btn-create-world').click();
      await expect(pageHost.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'home');
      await expect(pageHost.getByTestId('btn-top-invite')).toBeVisible();

      // 2. Host opens "Chơi cùng người thương" and waits for the single durable HTTPS tunnel link (never temporary 192.168 LAN IP)
      await pageHost.getByTestId('btn-remote-share').click();
      await expect(pageHost.getByTestId('remote-share-modal')).toBeVisible();
      await pageHost.getByTestId('remote-share-start-btn').click();
      await expect(pageHost.getByTestId('remote-share-url-input')).toBeVisible({ timeout: 25_000 });
      await expect(pageHost.getByTestId('remote-share-url-input')).toHaveValue(/^https:\/\//);
      await pageHost.getByTestId('remote-share-modal').getByRole('button', { name: 'Đóng' }).click();
      await expect(pageHost.getByTestId('partner-presence-pill')).toContainText('Nắng');

      let shareProxyUrl = '';
      await expect
        .poll(async () => {
          const st = await request.get(`${DEV_LAN}/remote-share`);
          const json = (await st.json()) as {
            data?: { active?: boolean; proxyPort?: number; sharePath?: string };
          };
          if (json.data?.active && json.data.proxyPort && json.data.sharePath) {
            shareProxyUrl = `http://127.0.0.1:${json.data.proxyPort}${json.data.sharePath}`;
            return true;
          }
          return false;
        })
        .toBe(true);

      // 3. Clean remote phone (no cookies/storage) opens the /__share/<token> link
      await pagePhone.goto(shareProxyUrl);
      await expect(pagePhone.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'home', {
        timeout: 15_000,
      });
      await expect(pagePhone.getByTestId('onboarding-error')).toHaveCount(0);

      // Verify remote host-admin action stays blocked (403) from the remote browser session
      const resetStatus = await pagePhone.evaluate(async () => {
        const res = await fetch('/api/dev-lan/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-dev-user-id': '22222222-2222-4222-8222-222222222222' },
          body: '{}',
        });
        return res.status;
      });
      expect(resetStatus).toBe(403);

      // 4. Both players see each other over WebSocket and phone displays live diagnostics
      await pageHost.getByTestId('connection-pill').click();
      await pagePhone.getByTestId('connection-pill').click();
      await expect(pagePhone.getByTestId('diag-status')).toHaveText('Connected');
      await expect(pagePhone.getByTestId('diag-transport')).toHaveText(/WS|WSS/);
      await expect(pagePhone.getByTestId('diag-players')).toHaveText('2/2');
      await expect(pagePhone.getByTestId('diag-rtt')).toContainText('ms');
      await expect(pagePhone.getByTestId('diag-jitter')).toContainText('ms');
      await expect(pagePhone.getByTestId('diag-remote')).toContainText('home (On map)');
      await expect(pageHost.getByTestId('diag-remote')).toContainText('home (On map)');

      // 5. Refresh preserves partner identity & re-enters world cleanly without onboarding
      await pagePhone.reload();
      await expect(pagePhone.getByTestId('game-canvas-host').locator('canvas')).toHaveAttribute('data-map-id', 'home', {
        timeout: 15_000,
      });
      await pagePhone.getByTestId('connection-pill').click();
      await expect(pagePhone.getByTestId('diag-players')).toHaveText('2/2');

      expect(errors).toEqual([]);
    } finally {
      await ctxHost.close().catch(() => {});
      await ctxPhone.close().catch(() => {});
      await request.delete(`${DEV_LAN}/remote-share`).catch(() => {});
    }
  });
});
