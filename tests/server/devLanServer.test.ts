import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';

const KHOI_ID = '11111111-1111-4111-8111-111111111111';
const HA_ANH_ID = '22222222-2222-4222-8222-222222222222';
const OUTSIDER_ID = '33333333-3333-4333-8333-333333333333';

describe('Dev LAN Multiplayer Server Handler', () => {
  let tmpDir: string;
  let server: http.Server;
  let baseUrl: string;
  let handler: ReturnType<typeof createDevLanHandler>;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-dev-lan-'));
    handler = createDevLanHandler({
      stateFilePath: path.join(tmpDir, 'state.json'),
    });
    server = http.createServer((req, res) => {
      void handler(req, res, () => {
        res.statusCode = 404;
        res.end('Not Found');
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    handler.closeAll();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function api(route: string, options: { method?: string; userId?: string; body?: unknown } = {}) {
    const res = await fetch(`${baseUrl}/api/dev-lan${route}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.userId ? { 'x-dev-user-id': options.userId } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    return { status: res.status, json: await res.json() };
  }

  it('enforces 2-member world cap, multi-device login per member, and rejects 3rd outsider everywhere', async () => {
    // 1. Mây creates couple world
    const createRes = await api('/world/create', {
      method: 'POST',
      userId: KHOI_ID,
      body: { worldName: 'Nhà Mây & Nắng', nickname: 'Mây' },
    });
    expect(createRes.status).toBe(200);
    const worldId = createRes.json.data.world.id;

    // 2. Mây creates one-time invite
    const invRes = await api('/world/invite', {
      method: 'POST',
      userId: KHOI_ID,
      body: { worldId },
    });
    expect(invRes.status).toBe(200);
    const code = invRes.json.data.inviteCode;

    // 3. Nắng joins from phone
    const redeemRes = await api('/world/redeem', {
      method: 'POST',
      userId: HA_ANH_ID,
      body: { inviteCode: code, nickname: 'Nắng' },
    });
    expect(redeemRes.status).toBe(200);
    expect(redeemRes.json.data.members).toHaveLength(2);

    // 4. Same account (Mây) logging in on a second device still gets snapshot & stays 2/2
    const secondDeviceSnap = await api('/world/snapshot', { userId: KHOI_ID });
    expect(secondDeviceSnap.status).toBe(200);
    expect(secondDeviceSnap.json.data.members).toHaveLength(2);

    // 5. Outsider (3rd account) trying invite redeem, snapshot, or SSE stream is rejected
    const outsiderRedeem = await api('/world/redeem', {
      method: 'POST',
      userId: OUTSIDER_ID,
      body: { inviteCode: code, nickname: 'Khách lạ' },
    });
    expect(outsiderRedeem.json.ok).toBe(false);

    const outsiderSnap = await api('/world/snapshot', { userId: OUTSIDER_ID });
    expect(outsiderSnap.json.data).toBeNull();

    const outsiderSse = await fetch(
      `${baseUrl}/api/dev-lan/events?worldId=${worldId}&userId=${OUTSIDER_ID}&sessionId=s-out`,
    );
    expect(outsiderSse.status).toBe(403);
  });

  it('prevents concurrent furniture overlap, supports idempotency, and resets cleanly', async () => {
    const seeded = await api('/seed-couple', { method: 'POST', body: {} });
    expect(seeded.status).toBe(200);
    const worldId = seeded.json.data.world.id;
    expect(seeded.json.data.members).toHaveLength(2);

    const placeA = await api('/furniture/place', {
      method: 'POST',
      userId: KHOI_ID,
      body: {
        worldId,
        mapId: 'home',
        sku: 'lamp_floor',
        tileX: 8,
        tileY: 5,
        expectedLayoutVersion: 1,
        idempotencyKey: 'k1',
      },
    });
    expect(placeA.status).toBe(200);
    expect(placeA.json.data.layoutVersion).toBe(2);

    // Idempotent retry
    const retryA = await api('/furniture/place', {
      method: 'POST',
      userId: KHOI_ID,
      body: {
        worldId,
        mapId: 'home',
        sku: 'lamp_floor',
        tileX: 8,
        tileY: 5,
        expectedLayoutVersion: 1,
        idempotencyKey: 'k1',
      },
    });
    expect(retryA.json.data).toEqual(placeA.json.data);

    // Nắng tries placing on same tile with version 2 -> TILE_OCCUPIED
    const conflictB = await api('/furniture/place', {
      method: 'POST',
      userId: HA_ANH_ID,
      body: {
        worldId,
        mapId: 'home',
        sku: 'plant_monstera',
        tileX: 8,
        tileY: 5,
        expectedLayoutVersion: 2,
        idempotencyKey: 'k2',
      },
    });
    expect(conflictB.status).toBe(400);
    expect(conflictB.json.code).toBe('TILE_OCCUPIED');

    // Reset clears world
    await api('/reset', { method: 'POST', body: {} });
    const afterReset = await api('/identities');
    expect(afterReset.json.data.worldExists).toBe(false);
    expect(afterReset.json.data.memberCount).toBe(0);
  });

  it('waits for async-loaded /donor/* route handlers on cold start instead of returning 404', async () => {
    let delayedHandler: ReturnType<typeof createDevLanHandler> | null = null;
    let delayedServer: http.Server | null = null;
    try {
      const delayedPromise = new Promise<
        (ctx: { res: http.ServerResponse; sendJson: (r: http.ServerResponse, s: number, d: unknown) => void }) => boolean
      >((resolve) => {
        setTimeout(() => {
          resolve(({ res, sendJson }) => {
            sendJson(res, 200, { ok: true, data: { warmed: true } });
            return true;
          });
        }, 40);
      });

      delayedHandler = createDevLanHandler({
        stateFilePath: path.join(tmpDir, 'cold-start-state.json'),
        getTryHandleDonorDevLan: () => delayedPromise,
      });
      delayedServer = http.createServer((req, res) => {
        void delayedHandler!(req, res, () => {
          res.statusCode = 404;
          res.end('Not Found');
        });
      });
      await new Promise<void>((resolve) => {
        delayedServer!.listen(0, '127.0.0.1', () => resolve());
      });
      const addr = delayedServer.address() as { port: number };
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/dev-lan/donor/workshop/queue?worldId=w1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-user-id': KHOI_ID },
        body: '{}',
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; data: { warmed: boolean } };
      expect(body.ok).toBe(true);
      expect(body.data.warmed).toBe(true);
    } finally {
      delayedHandler?.closeAll();
      if (delayedServer) {
        await new Promise<void>((resolve) => delayedServer!.close(() => resolve()));
      }
    }
  });
});
