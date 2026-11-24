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

describe('V0.1.5 Silent Study Room Pomodoro Contract (OLW-015-05/06)', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    stateFile = path.join(os.tmpdir(), `olw-v015-study-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({ stateFilePath: stateFile });
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    handler.closeAll();
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  it('syncs shared Pomodoro across couple, restricts lifecycle control to owner, and isolates independent solo sessions', async () => {
    // Mây starts shared 25/5 session
    const started = await callApi(handler, 'POST', '/study/start', MAY_ID, {
      worldId,
      mode: 'shared',
      focusMinutes: 25,
      breakMinutes: 5,
      idempotencyKey: 'study-start-shared-1',
    });
    expect(started.status).toBe(200);
    const shared = started.json.data.sharedSession;
    expect(shared).toBeTruthy();
    expect(shared.ownerId).toBe(MAY_ID);
    expect(shared.status).toBe('running');

    // Nắng sees the shared session cleanly, but CANNOT pause/finish Mây's session
    const nangSnap = await callApi(handler, 'GET', `/study?worldId=${worldId}`, NANG_ID);
    expect(nangSnap.json.data.sharedSession.id).toBe(shared.id);

    const nangPauseAttempt = await callApi(handler, 'POST', '/study/control', NANG_ID, {
      worldId,
      sessionId: shared.id,
      action: 'pause',
      expectedVersion: 1,
      idempotencyKey: 'study-ctrl-nang-1',
    });
    expect(nangPauseAttempt.status).toBe(403);

    // Both Mây and Nắng can start independent solo sessions simultaneously
    const soloMay = await callApi(handler, 'POST', '/study/start', MAY_ID, {
      worldId,
      mode: 'solo',
      focusMinutes: 45,
      breakMinutes: 10,
      idempotencyKey: 'study-solo-may',
    });
    const soloNang = await callApi(handler, 'POST', '/study/start', NANG_ID, {
      worldId,
      mode: 'solo',
      focusMinutes: 60,
      breakMinutes: 10,
      idempotencyKey: 'study-solo-nang',
    });
    expect(soloMay.status).toBe(200);
    expect(soloNang.status).toBe(200);
    expect(soloMay.json.data.soloSession.focusMinutes).toBe(45);
    expect(soloNang.json.data.soloSession.focusMinutes).toBe(60);

    // Mây pauses then finishes shared session cleanly
    const paused = await callApi(handler, 'POST', '/study/control', MAY_ID, {
      worldId,
      sessionId: shared.id,
      action: 'pause',
      expectedVersion: 1,
      idempotencyKey: 'study-pause-1',
    });
    expect(paused.status).toBe(200);
    expect(paused.json.data.sharedSession.status).toBe('paused');

    const finished = await callApi(handler, 'POST', '/study/control', MAY_ID, {
      worldId,
      sessionId: shared.id,
      action: 'finish',
      expectedVersion: 2,
      idempotencyKey: 'study-finish-1',
    });
    expect(finished.status).toBe(200);
    expect(finished.json.data.sharedSession).toBeNull();

    // Outsider blocked
    const outsider = await callApi(handler, 'GET', `/study?worldId=${worldId}`, OUTSIDER_ID);
    expect(outsider.status).toBe(403);
  });
});
