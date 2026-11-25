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

describe('V0.1.5 Pet MVP Contract & Feed Race (OLW-015-03)', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    stateFile = path.join(os.tmpdir(), `olw-v015-pet-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({ stateFilePath: stateFile });
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    handler.closeAll();
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  it('adopts, renames, enforces single-kibble feed race + idempotent replay before version check', async () => {
    // Claim free starter kibble (3)
    await callApi(handler, 'POST', '/inventory/claim-free-kibble', MAY_ID, {
      worldId,
      idempotencyKey: 'claim-1',
    });

    // Adopt cat named Quýt
    const adopted = await callApi(handler, 'POST', '/pet/adopt-or-rename', MAY_ID, {
      worldId,
      name: 'Quýt',
      expectedVersion: null,
      idempotencyKey: 'adopt-1',
    });
    expect(adopted.status).toBe(200);
    expect(adopted.json.data.name).toBe('Quýt');
    expect(adopted.json.data.version).toBe(1);
    const petId = adopted.json.data.id;

    // Partner B (Nắng) reads same shared pet
    const nangView = await callApi(handler, 'GET', `/pet?worldId=${worldId}`, NANG_ID);
    expect(nangView.json.data.id).toBe(petId);
    expect(nangView.json.data.name).toBe('Quýt');

    const legacyFeed = await callApi(handler, 'POST', '/pet/interact', MAY_ID, {
      worldId,
      petId,
      action: 'feed',
      expectedVersion: 1,
      idempotencyKey: 'feed-may-1',
    });
    expect(legacyFeed.status).toBe(403);
    expect(legacyFeed.json.code).toBe('SERVER_AUTHORITY_REQUIRED');

  const fillMay = await callApi(handler, 'POST', '/pet/care/apply', MAY_ID, {
      worldId,
      petId,
      action: 'fill_food',
      expectedBowlVersion: 1,
      ownerScope: 'shared',
      itemSku: 'pet_kibble_basic',
      quality: 'normal',
      idempotencyKey: 'fill-may-1',
    });
    expect(fillMay.status).toBe(200);
    expect(fillMay.json.data.bowl.version).toBe(2);

    const fillNangRace = await callApi(handler, 'POST', '/pet/care/apply', NANG_ID, {
      worldId,
      petId,
      action: 'fill_food',
      expectedBowlVersion: 1,
      ownerScope: 'shared',
      itemSku: 'pet_kibble_basic',
      quality: 'normal',
      idempotencyKey: 'fill-nang-1',
    });
    expect(fillNangRace.status).toBe(409);
    expect(fillNangRace.json.code).toBe('VERSION_CONFLICT');

    const replayMay = await callApi(handler, 'POST', '/pet/care/apply', MAY_ID, {
      worldId,
      petId,
      action: 'fill_food',
      expectedBowlVersion: 1,
      ownerScope: 'shared',
      itemSku: 'pet_kibble_basic',
      quality: 'normal',
      idempotencyKey: 'fill-may-1',
    });
    expect(replayMay.status).toBe(200);
    expect(replayMay.json.data.bowl.version).toBe(2);

    const petMay = await callApi(handler, 'POST', '/pet/interact', MAY_ID, {
      worldId,
      petId,
      action: 'pet',
      expectedVersion: 1,
      idempotencyKey: 'pet-may-1',
    });
    expect(petMay.status).toBe(200);
    expect(petMay.json.data.pet.version).toBe(2);

    // Outsider rejected
    const outsider = await callApi(handler, 'GET', `/pet?worldId=${worldId}`, OUTSIDER_ID);
    expect(outsider.status).toBe(403);
  });
});
