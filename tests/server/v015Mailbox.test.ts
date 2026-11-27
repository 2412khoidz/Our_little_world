// @vitest-environment node
import { MAX_INVENTORY_QUANTITY } from '../../src/shared/inventory/inventoryLedger.mjs';
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

describe('V0.1.5 Mailbox & Surprise Gifts (OLW-015-02)', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    stateFile = path.join(os.tmpdir(), `olw-v015-mailbox-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({ stateFilePath: stateFile });
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  it('delivers surprise gift offline with server redaction, prevents double-open race, and preserves HTML as plain text', async () => {
    await callApi(handler, 'POST', '/inventory/claim-free-kibble', MAY_ID, {
      worldId,
      idempotencyKey: 'claim-1',
    });

    // Self-send / outsider / spoofed recipient checks
    const selfSend = await callApi(handler, 'POST', '/mailbox/send', MAY_ID, {
      worldId,
      recipientId: MAY_ID,
      subject: 'Tự gửi',
      body: 'Hello',
      giftItemSku: null,
      giftQty: 0,
      sourceScope: 'shared',
      isSurprise: true,
      idempotencyKey: 'mail-self',
    });
    expect(selfSend.status).toBe(400);

    const outsiderRead = await callApi(
      handler,
      'GET',
      `/mailbox?worldId=${encodeURIComponent(worldId)}`,
      OUTSIDER_ID,
    );
    expect(outsiderRead.status).toBe(403);

    const spoofRecipient = await callApi(handler, 'POST', '/mailbox/send', MAY_ID, {
      worldId,
      recipientId: OUTSIDER_ID,
      subject: 'Spoof',
      body: 'Out of world',
      giftItemSku: null,
      giftQty: 0,
      sourceScope: 'shared',
      isSurprise: false,
      idempotencyKey: 'mail-spoof',
    });
    expect(spoofRecipient.status).toBe(403);

    // Mây sends surprise gift + raw HTML payload to Nắng (who checks mailbox later)
    const xssPayload = '<img src=x onerror=alert(1)> Nhớ em!';
    const sendRes = await callApi(handler, 'POST', '/mailbox/send', MAY_ID, {
      worldId,
      recipientId: NANG_ID,
      subject: 'Quà sáng',
      body: xssPayload,
      giftItemSku: 'pet_kibble_basic',
      giftQty: 2,
      sourceScope: 'shared',
      isSurprise: true,
      idempotencyKey: 'mail-send-1',
    });
    expect(sendRes.status).toBe(200);

    // Before Nắng opens it, body & gift are strictly redacted server-side while unreadCount === 1
    const inbox = await callApi(
      handler,
      'GET',
      `/mailbox?worldId=${encodeURIComponent(worldId)}`,
      NANG_ID,
    );
    expect(inbox.status).toBe(200);
    expect(inbox.json.data.unreadCount).toBe(1);
    const giftItem = inbox.json.data.items[0];
    expect(giftItem.body).toBeNull();
    expect(giftItem.giftItemSku).toBeNull();
    expect(giftItem.giftQty).toBe(0);
    expect(giftItem.bodyRedacted).toBe(true);
    expect(giftItem.giftRedacted).toBe(true);

    // Concurrent double-open race: exactly ONE succeeds, second gets 409 ALREADY_OPENED
    const [open1, open2] = await Promise.all([
      callApi(handler, 'POST', '/mailbox/open', NANG_ID, {
        worldId,
        letterId: giftItem.id,
        idempotencyKey: 'open-race-1',
      }),
      callApi(handler, 'POST', '/mailbox/open', NANG_ID, {
        worldId,
        letterId: giftItem.id,
        idempotencyKey: 'open-race-2',
      }),
    ]);
    expect([open1.status, open2.status].sort((a, b) => a - b)).toEqual([200, 409]);

    const winner = open1.status === 200 ? open1.json.data : open2.json.data;
    expect(winner.mailbox.unreadCount).toBe(0);
    expect(winner.mailbox.items[0].body).toBe(xssPayload);
    expect(winner.mailbox.items[0].giftItemSku).toBe('pet_kibble_basic');
    expect(winner.mailbox.items[0].giftQty).toBe(2);

    const personal = winner.inventory.items.find(
      (i: { ownerScope: string; itemSku: string }) =>
        i.ownerScope === `user:${NANG_ID}` && i.itemSku === 'pet_kibble_basic',
    );
    expect(personal?.qty).toBe(2);
  });

  it('rolls back without setting openedAt when recipient reaches the storage ceiling and succeeds on retry after space frees', async () => {
    await callApi(handler, 'POST', '/inventory/claim-free-kibble', MAY_ID, {
      worldId,
      idempotencyKey: 'claim-1',
    });

    const sendRes = await callApi(handler, 'POST', '/mailbox/send', MAY_ID, {
      worldId,
      recipientId: NANG_ID,
      subject: 'Thêm hạt cho Nắng',
      body: 'Gửi em 3 phần hạt nhé!',
      giftItemSku: 'pet_kibble_basic',
      giftQty: 3,
      sourceScope: 'shared',
      isSurprise: true,
      idempotencyKey: 'mail-send-full',
    });
    expect(sendRes.status).toBe(200);
    const letterId = sendRes.json.data.mailbox.items[0].id as string;

    // Put the destination one below the storage ceiling.
    const db = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    db.v015.inventory[worldId].push({
      worldId,
      ownerScope: `user:${NANG_ID}`,
      itemSku: 'pet_kibble_basic',
      qty: MAX_INVENTORY_QUANTITY - 1,
      updatedAt: new Date().toISOString(),
    });
    fs.writeFileSync(stateFile, JSON.stringify(db, null, 2), 'utf8');
    handler = createDevLanHandler({ stateFilePath: stateFile });

    // Adding all three would exceed the integer storage ceiling.
    const fullAttempt = await callApi(handler, 'POST', '/mailbox/open', NANG_ID, {
      worldId,
      letterId,
      idempotencyKey: 'open-when-full',
    });
    expect(fullAttempt.status).toBe(409);
    expect(fullAttempt.json.code).toBe('STACK_FULL');

    const stillUnread = await callApi(
      handler,
      'GET',
      `/mailbox?worldId=${encodeURIComponent(worldId)}`,
      NANG_ID,
    );
    expect(stillUnread.json.data.unreadCount).toBe(1);
    expect(stillUnread.json.data.items[0].openedAt).toBeNull();

    // An ordinary stack can cross its cell size when receiving a gift.
    const dbRetry = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const entry = dbRetry.v015.inventory[worldId].find(
      (i: { ownerScope: string; itemSku: string }) =>
        i.ownerScope === `user:${NANG_ID}` && i.itemSku === 'pet_kibble_basic',
    );
    entry.qty = 9;
    fs.writeFileSync(stateFile, JSON.stringify(dbRetry, null, 2), 'utf8');
    handler = createDevLanHandler({ stateFilePath: stateFile });

    const retryAttempt = await callApi(handler, 'POST', '/mailbox/open', NANG_ID, {
      worldId,
      letterId,
      idempotencyKey: 'open-after-space',
    });
    expect(retryAttempt.status).toBe(200);
    expect(retryAttempt.json.data.mailbox.unreadCount).toBe(0);
    const updatedPersonal = retryAttempt.json.data.inventory.items.find(
      (i: { ownerScope: string; itemSku: string }) =>
        i.ownerScope === `user:${NANG_ID}` && i.itemSku === 'pet_kibble_basic',
    );
    expect(updatedPersonal?.qty).toBe(12);
  });
});
