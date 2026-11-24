// @vitest-environment node
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';

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
    expect(initial.json.data.items).toEqual([]);

    // Claim by Mây
    const claimA = await callApi(handler, 'POST', '/inventory/claim-free-kibble', MAY_ID, {
      worldId,
      idempotencyKey: 'kibble-key-1',
    });
    expect(claimA.status).toBe(200);
    expect(claimA.json.data.canClaimFreeKibble).toBe(false);
    expect(claimA.json.data.items).toEqual([
      expect.objectContaining({ ownerScope: 'shared', itemSku: 'pet_kibble_basic', qty: 3 }),
    ]);

    // Same actor exact retry replays cached response cleanly
    const replayA = await callApi(handler, 'POST', '/inventory/claim-free-kibble', MAY_ID, {
      worldId,
      idempotencyKey: 'kibble-key-1',
    });
    expect(replayA.status).toBe(200);
    expect(replayA.json.data.items[0].qty).toBe(3);

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
