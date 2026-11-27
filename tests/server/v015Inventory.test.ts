// @vitest-environment node
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';
import { tryHandleFarmDevLan } from '../../src/server/devLanFarmRoute';

const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';
const OUTSIDER_ID = '33333333-3333-4333-8333-333333333333';

async function callApi(
  handler: ReturnType<typeof createDevLanHandler>,
  method: string,
  url: string,
  userId?: string,
  body?: unknown,
) {
  const payload = body !== undefined ? JSON.stringify(body) : '';
  const req = Readable.from(payload ? [Buffer.from(payload, 'utf8')] : []) as unknown as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  req.method = method;
  req.url = `/api/dev-lan${url}`;
  req.headers = userId ? { 'x-dev-user-id': userId } : {};

  let statusCode = 200;
  let rawBody = '';
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    setHeader: () => void;
    end: (chunk?: string) => void;
  };
  Object.defineProperty(res, 'statusCode', {
    get: () => statusCode,
    set: (v: number) => {
      statusCode = v;
    },
  });
  res.setHeader = () => {};
  res.end = (chunk = '') => {
    rawBody += chunk;
  };

  await handler(req as never, res as never);
  return { status: statusCode, json: rawBody ? JSON.parse(rawBody) : null };
}

describe('V0.1.5 Inventory Contract (OLW-015-01)', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    stateFile = path.join(os.tmpdir(), `olw-v015-inv-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({ stateFilePath: stateFile });
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    handler.closeAll();
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  it('grants free starter kibble once per day, replays idempotently, and blocks duplicate claim/conflict/outsider', async () => {
    const initial = await callApi(handler, 'GET', `/inventory?worldId=${worldId}`, MAY_ID);
    expect(initial.status).toBe(200);
    expect(initial.json.data.canClaimFreeKibble).toBe(true);
    expect(initial.json.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ ownerScope: 'shared', itemSku: 'toy_yarn', qty: 1 })]),
    );

    const claimA = await callApi(handler, 'POST', '/inventory/claim-free-kibble', MAY_ID, {
      worldId,
      idempotencyKey: 'kibble-key-1',
    });
    expect(claimA.status).toBe(200);
    expect(claimA.json.data.canClaimFreeKibble).toBe(false);
    expect(claimA.json.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownerScope: 'shared', itemSku: 'pet_kibble_basic', qty: 3 }),
      ]),
    );

    // Same actor exact retry replays cached response cleanly
    const replayA = await callApi(handler, 'POST', '/inventory/claim-free-kibble', MAY_ID, {
      worldId,
      idempotencyKey: 'kibble-key-1',
    });
    expect(replayA.status).toBe(200);
    const replayKibble = replayA.json.data.items.find(
      (i: { itemSku: string }) => i.itemSku === 'pet_kibble_basic',
    );
    expect(replayKibble?.qty).toBe(3);

    // Same idempotency key by different actor (Nắng) is rejected
    const conflictB = await callApi(handler, 'POST', '/inventory/claim-free-kibble', NANG_ID, {
      worldId,
      idempotencyKey: 'kibble-key-1',
    });
    expect(conflictB.status).toBe(409);
    expect(conflictB.json.code).toBe('IDEMPOTENCY_CONFLICT');

    // Separate key concurrent claim by Nắng on same day is blocked
    const secondClaimB = await callApi(handler, 'POST', '/inventory/claim-free-kibble', NANG_ID, {
      worldId,
      idempotencyKey: 'kibble-key-2',
    });
    expect(secondClaimB.status).toBe(409);
    expect(secondClaimB.json.code).toBe('COOLDOWN_ACTIVE');

    // Outsider cannot read inventory
    const outsiderRes = await callApi(handler, 'GET', `/inventory?worldId=${worldId}`, OUTSIDER_ID);
    expect(outsiderRes.status).toBe(403);
  });

  it('migrates legacy saves once, preserves the wallet, and never restores spent resources', async () => {
    const db = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    delete db.v015.inventoryStarterVersions[worldId];
    db.v015.inventory[worldId] = [1, 3].map((qty) => ({
      worldId, ownerScope: 'shared', itemSku: 'apple', qty, updatedAt: new Date().toISOString(),
    }));
    db.v015.wallets[worldId] = { coins: 937 };
    db.v015.pets[worldId] = {
      id: 'pet-legacy',
      worldId,
      species: 'cat-orange',
      name: 'Mochi',
      vitals: { hunger: 80, energy: 70, fun: 75 },
      emotion: 'happy',
      mapId: 'home',
      anchorTileX: 13,
      anchorTileY: 10,
      lastFedAtMs: null,
      lastWateredAtMs: null,
      lastPettedAtMs: null,
      simStateAtMs: Date.now(),
      version: 1,
      updatedAt: new Date().toISOString(),
      serverNowMs: Date.now(),
    };
    fs.writeFileSync(stateFile, JSON.stringify(db), 'utf8');

    const h2 = createDevLanHandler({ stateFilePath: stateFile, getTryHandleFarmDevLan: () => tryHandleFarmDevLan });
    try {
      const inv = await callApi(h2, 'GET', `/inventory?worldId=${worldId}`, MAY_ID);
      expect(inv.json.data.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ itemSku: 'tool_hoe', qty: 1 }),
        expect.objectContaining({ itemSku: 'apple', qty: 4 }),
      ]));
      const skus = inv.json.data.items.map((row: { itemSku: string }) => row.itemSku);
      for (const spent of ['seed_wheat', 'fish_salmon_bite', 'toy_yarn']) expect(skus).not.toContain(spent);
      const farm = await callApi(h2, 'GET', `/farm?worldId=${worldId}`, MAY_ID);
      expect(farm.json.data.walletCoins).toBe(937);
      const migrated = fs.readFileSync(stateFile, 'utf8');
      expect(JSON.parse(migrated).v015.wallets[worldId].coins).toBe(937);
      expect(JSON.parse(migrated).v015.inventoryStarterVersions[worldId]).toBe(1);
      const h3 = createDevLanHandler({ stateFilePath: stateFile });
      try {
        const afterRestart = await callApi(h3, 'GET', `/inventory?worldId=${worldId}`, MAY_ID);
        expect(afterRestart.json.data.items).toEqual(inv.json.data.items);
        expect(fs.readFileSync(stateFile, 'utf8')).toBe(migrated);
      } finally {
        h3.closeAll();
      }
    } finally {
      h2.closeAll();
    }
  });

  it('isolates personal user:<uuid> pockets so Nắng cannot see Mây private items', async () => {
    const db = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    db.v015.inventory[worldId] = [
      {
        worldId,
        ownerScope: `user:${MAY_ID}`,
        itemSku: 'gift_strawberry_cake',
        qty: 1,
        updatedAt: new Date().toISOString(),
      },
      {
        worldId,
        ownerScope: `user:${NANG_ID}`,
        itemSku: 'gift_flower_bouquet',
        qty: 2,
        updatedAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(stateFile, JSON.stringify(db), 'utf8');

    // Reload handler cleanly to simulate fresh restart from disk
    const h2 = createDevLanHandler({ stateFilePath: stateFile });
    try {
      const mayInv = await callApi(h2, 'GET', `/inventory?worldId=${worldId}`, MAY_ID);
      expect(mayInv.json.data.items).toEqual([
        expect.objectContaining({ ownerScope: `user:${MAY_ID}`, itemSku: 'gift_strawberry_cake' }),
      ]);
      const nangInv = await callApi(h2, 'GET', `/inventory?worldId=${worldId}`, NANG_ID);
      expect(nangInv.json.data.items).toEqual([
        expect.objectContaining({ ownerScope: `user:${NANG_ID}`, itemSku: 'gift_flower_bouquet' }),
      ]);
    } finally {
      h2.closeAll();
    }
  });

  it('adds deltas atomically on concurrent brand-new SKU grants without overwriting', async () => {
    // Note: Dev LAN verifies single-process JS handler parity; real Postgres transaction concurrency
    // requires executing supabase/tests/v015_inventory_security.sql on PostgreSQL.
    const [r1, r2] = await Promise.all([
      callApi(handler, 'POST', '/dev-console/spawn-item', MAY_ID, {
        worldId,
        scope: 'shared',
        itemSku: 'gift_star_jar',
        qty: 2,
      }),
      callApi(handler, 'POST', '/dev-console/spawn-item', NANG_ID, {
        worldId,
        scope: 'shared',
        itemSku: 'gift_star_jar',
        qty: 2,
      }),
    ]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const inv = await callApi(handler, 'GET', `/inventory?worldId=${worldId}`, MAY_ID);
    const jar = inv.json.data.items.find(
      (i: { ownerScope: string; itemSku: string }) =>
        i.ownerScope === 'shared' && i.itemSku === 'gift_star_jar',
    );
    expect(jar?.qty).toBe(4);
  });
});
