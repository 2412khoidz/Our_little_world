// @vitest-environment node
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';

const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';

function makeMockReq(method: string, url: string, userId?: string, body?: unknown) {
  const payload = body !== undefined ? JSON.stringify(body) : '';
  const req = Readable.from(payload ? [Buffer.from(payload, 'utf8')] : []) as unknown as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  req.method = method;
  req.url = `/api/dev-lan${url}`;
  req.headers = userId ? { 'x-dev-user-id': userId } : {};
  return req;
}

async function callApi(
  handler: ReturnType<typeof createDevLanHandler>,
  method: string,
  url: string,
  userId?: string,
  body?: unknown,
) {
  const req = makeMockReq(method, url, userId, body);
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

function openMockSse(
  handler: ReturnType<typeof createDevLanHandler>,
  url: string,
) {
  const req = new EventEmitter() as EventEmitter & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  req.method = 'GET';
  req.url = `/api/dev-lan${url}`;
  req.headers = {};

  const chunks: string[] = [];
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    writableEnded: boolean;
    destroyed: boolean;
    socket: { setNoDelay: (noDelay: boolean) => void };
    setHeader: () => void;
    flushHeaders: () => void;
    write: (chunk: string) => void;
    end: (chunk?: string) => void;
  };
  res.statusCode = 200;
  res.writableEnded = false;
  res.destroyed = false;
  res.socket = { setNoDelay: () => {} };
  res.setHeader = () => {};
  res.flushHeaders = () => {};
  res.write = (chunk: string) => {
    chunks.push(chunk);
  };
  res.end = (chunk = '') => {
    if (chunk) chunks.push(chunk);
    res.writableEnded = true;
  };

  void handler(req as never, res as never);

  const parseEvents = () => {
    const joined = chunks.join('');
    const blocks = joined.split('\n\n').filter(Boolean);
    const out: Array<{ event: string; data: unknown }> = [];
    for (const block of blocks) {
      let ev = '';
      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
      }
      if (ev && dataLine) {
        out.push({ event: ev, data: JSON.parse(dataLine) });
      }
    }
    return out;
  };

  return { req, res, chunks, parseEvents };
}

describe('Dev LAN SSE presence sync, peer replay & transient reconnect grace', () => {
  let stateFile: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    stateFile = path.join(os.tmpdir(), `olw-sse-sync-${Date.now()}-${Math.random()}.json`);
    handler = createDevLanHandler({ stateFilePath: stateFile });
    const seed = await callApi(handler, 'POST', '/seed-couple', MAY_ID, {});
    worldId = seed.json.data.world.id;
  });

  afterEach(() => {
    handler.closeAll();
    vi.useRealTimers();
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  it('updates presence from movement, replays latest peer movement to late joiner, and keeps presence during brief tunnel reconnects', async () => {
    // 1. Mây connects SSE initially in home, then walks to garden.
    const maySse = openMockSse(
      handler,
      `/events?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-may&mapId=home&tileX=8&tileY=9&facing=down`,
    );

    const gardenPacket = {
      worldId,
      userId: MAY_ID,
      sessionId: 'sess-may',
      mapId: 'garden',
      seq: 12,
      timestampMs: Date.now(),
      x: 136,
      y: 122,
      facing: 'right',
      anim: 'walk',
    };
    const moveRes = await callApi(handler, 'POST', '/realtime', MAY_ID, {
      worldId,
      kind: 'movement',
      sessionId: 'sess-may',
      payload: gardenPacket,
    });
    expect(moveRes.status).toBe(200);

    // 2. Nắng connects later in garden — immediately receives Mây in garden AND replayed movement packet at exact (136, 122).
    const nangSse = openMockSse(
      handler,
      `/events?worldId=${worldId}&userId=${NANG_ID}&sessionId=sess-nang&mapId=garden&tileX=9&tileY=7&facing=left`,
    );

    const nangEvents = nangSse.parseEvents();
    const syncs = nangEvents.filter((e) => e.event === 'presence_sync');
    expect(syncs.length).toBeGreaterThanOrEqual(1);
    const latestSync = syncs[syncs.length - 1]!.data as Array<{
      userId: string;
      mapId: string;
      x?: number;
      y?: number;
    }>;
    const mayPresence = latestSync.find((p) => p.userId === MAY_ID);
    expect(mayPresence).toBeDefined();
    expect(mayPresence?.mapId).toBe('garden');
    expect(mayPresence?.x).toBe(136);
    expect(mayPresence?.y).toBe(122);

    const replayedMove = nangEvents.find((e) => e.event === 'movement');
    expect(replayedMove?.data).toMatchObject({
      userId: MAY_ID,
      mapId: 'garden',
      x: 136,
      y: 122,
    });

    // 3. Mây suffers a brief tunnel disconnect & reconnects within 1.2s using stale initial query params (?mapId=home):
    // server preserves Mây's garden position and NEVER broadcasts an empty/missing-Mây frame during grace!
    const nangCountBefore = nangSse.parseEvents().filter((e) => e.event === 'presence_sync').length;
    maySse.req.emit('close');
    vi.advanceTimersByTime(1200);
    const nangCountDuringGrace = nangSse.parseEvents().filter((e) => e.event === 'presence_sync').length;
    expect(nangCountDuringGrace).toBe(nangCountBefore);

    const mayReconnect = openMockSse(
      handler,
      `/events?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-may&mapId=home&tileX=8&tileY=9&facing=down`,
    );
    const mayReconnectSync = mayReconnect.parseEvents().filter((e) => e.event === 'presence_sync');
    const mayAfterReconnect = (mayReconnectSync[mayReconnectSync.length - 1]!.data as Array<{
      userId: string;
      mapId: string;
      x?: number;
    }>).find((p) => p.userId === MAY_ID);
    expect(mayAfterReconnect?.mapId).toBe('garden');
    expect(mayAfterReconnect?.x).toBe(136);
  });
});
