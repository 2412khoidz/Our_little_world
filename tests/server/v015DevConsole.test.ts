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

describe('V0.1.5 Dev Console K6 & Sanitized Snapshot (OLW-015-08)', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    stateFile = path.join(os.tmpdir(), `olw-v015-devconsole-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({ stateFilePath: stateFile });
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  it('spawns items, updates pet vitals, advances study, strips secrets in snapshots, and blocks outsiders', async () => {
    // Outsider strictly denied
    const outsiderSpawn = await callApi(handler, 'POST', '/dev-console/spawn-item', OUTSIDER_ID, {
      worldId,
      scope: 'shared',
      itemSku: 'pet_kibble_basic',
      qty: 3,
    });
    expect(outsiderSpawn.status).toBe(403);

    // Spawn item into personal pocket
    const spawnRes = await callApi(handler, 'POST', '/dev-console/spawn-item', MAY_ID, {
      worldId,
      scope: 'personal',
      itemSku: 'gift_flower_bouquet',
      qty: 2,
    });
    expect(spawnRes.status).toBe(200);
    const bouquet = spawnRes.json.data.items.find(
      (i: { ownerScope: string; itemSku: string }) =>
        i.ownerScope === `user:${MAY_ID}` && i.itemSku === 'gift_flower_bouquet',
    );
    expect(bouquet?.qty).toBe(2);

    // Adopt pet then set pet vitals via dev console
    await callApi(handler, 'POST', '/pet/adopt-or-rename', MAY_ID, {
      worldId,
      name: 'Quýt',
      expectedVersion: null,
      idempotencyKey: 'dc-adopt',
    });
    const petRes = await callApi(handler, 'POST', '/dev-console/set-pet', MAY_ID, {
      worldId,
      hunger: 32,
      energy: 48,
      fun: 50,
    });
    expect(petRes.status).toBe(200);
    expect(petRes.json.data.emotion).toBe('hungry');

    // Start study session then advance it by 1500 seconds (25 min)
    const studyStart = await callApi(handler, 'POST', '/study/start', MAY_ID, {
      worldId,
      mode: 'shared',
      focusMinutes: 25,
      breakMinutes: 5,
      idempotencyKey: 'dc-study-start',
    });
    const sessionId = studyStart.json.data.sharedSession.id as string;
    const advanced = await callApi(handler, 'POST', '/dev-console/advance-study', MAY_ID, {
      worldId,
      sessionId,
      deltaSeconds: 1500,
    });
    expect(advanced.status).toBe(200);
    expect(advanced.json.data.sharedSession.phase).toBe('break');

    // Put private letter & dev email in DB, then export snapshot — must strip both!
    const secretBody = 'SECRET_PRIVATE_LETTER_NOTE_NEVER_EXPORT';
    await callApi(handler, 'POST', '/mailbox/send', MAY_ID, {
      worldId,
      recipientId: NANG_ID,
      subject: 'Private Secret',
      body: secretBody,
      giftItemSku: null,
      giftQty: 0,
      sourceScope: 'shared',
      isSurprise: true,
      idempotencyKey: 'dc-secret-mail',
    });

    const exported = await callApi(
      handler,
      'GET',
      `/dev-console/snapshot-export?worldId=${encodeURIComponent(worldId)}`,
      MAY_ID,
    );
    expect(exported.status).toBe(200);
    const snapText = JSON.stringify(exported.json.data);
    expect(snapText).not.toContain(secretBody);
    expect(snapText).not.toContain('@ourlittleworld.test');
    expect(exported.json.data.schemaVersion).toBe(1);
    expect(exported.json.data.worldId).toBe(worldId);

    // Reject snapshot with mismatched worldId or schemaVersion
    const badSnap = await callApi(handler, 'POST', '/dev-console/snapshot-restore', MAY_ID, {
      worldId,
      snapshot: { ...exported.json.data, schemaVersion: 99 },
    });
    expect(badSnap.status).toBe(400);

    // Modify item qty then restore sanitized snapshot cleanly
    await callApi(handler, 'POST', '/dev-console/spawn-item', MAY_ID, {
      worldId,
      scope: 'personal',
      itemSku: 'gift_flower_bouquet',
      qty: -1,
    });
    const restoreRes = await callApi(handler, 'POST', '/dev-console/snapshot-restore', MAY_ID, {
      worldId,
      snapshot: exported.json.data,
    });
    expect(restoreRes.status).toBe(200);

    const afterInv = await callApi(
      handler,
      'GET',
      `/inventory?worldId=${encodeURIComponent(worldId)}`,
      MAY_ID,
    );
    const restoredBouquet = afterInv.json.data.items.find(
      (i: { ownerScope: string; itemSku: string }) =>
        i.ownerScope === `user:${MAY_ID}` && i.itemSku === 'gift_flower_bouquet',
    );
    expect(restoredBouquet?.qty).toBe(2);
  });
});
