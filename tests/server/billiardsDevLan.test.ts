import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const PARTNER_ID = '22222222-2222-4222-8222-222222222222';
const OUTSIDER_ID = '33333333-3333-4333-8333-333333333333';

describe('Dev LAN Billiards relay & idempotent match persistence', () => {
  let tmpDir: string;
  let server: http.Server;
  let baseUrl: string;
  let handler: ReturnType<typeof createDevLanHandler>;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-billiards-dev-'));
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

  it('enforces idempotency, membership, and relays billiards_event SSE packets with server-stamped senderUserId', async () => {
    const seeded = await api('/seed-couple', { method: 'POST', body: {} });
    expect(seeded.status).toBe(200);
    const worldId = seeded.json.data.world.id as string;

    // Owner records match-1
    const rec1 = await api('/billiards/record', {
      method: 'POST',
      userId: OWNER_ID,
      body: {
        worldId,
        matchId: 'billiards-match-1',
        rule: '8ball',
        rackSeed: 20261126,
        winnerUserId: OWNER_ID,
        loserUserId: PARTNER_ID,
        reason: 'Sunk 8 ball',
        shots: [{ shotIndex: 0 }],
        durationSeconds: 32,
      },
    });
    expect(rec1.status).toBe(200);
    expect(rec1.json.data.inserted).toBe(true);
    expect(rec1.json.data.tallies).toEqual([{ userId: OWNER_ID, wins: 1 }]);

    // Partner reports the exact same matchId -> idempotent, still 1 win
    const recDup = await api('/billiards/record', {
      method: 'POST',
      userId: PARTNER_ID,
      body: {
        worldId,
        matchId: 'billiards-match-1',
        rule: '8ball',
        rackSeed: 20261126,
        winnerUserId: OWNER_ID,
        loserUserId: PARTNER_ID,
        reason: 'Duplicate client report',
        shots: [{ shotIndex: 0 }],
        durationSeconds: 32,
      },
    });
    expect(recDup.status).toBe(200);
    expect(recDup.json.data.inserted).toBe(false);
    expect(recDup.json.data.tallies).toEqual([{ userId: OWNER_ID, wins: 1 }]);

    // Stats endpoint shows 1 total match
    const stats = await api(`/billiards/stats?worldId=${encodeURIComponent(worldId)}`, {
      userId: PARTNER_ID,
    });
    expect(stats.status).toBe(200);
    expect(stats.json.data.totalMatches).toBe(1);

    // Outsider cannot read or write billiards matches
    const outsiderStats = await api(`/billiards/stats?worldId=${encodeURIComponent(worldId)}`, {
      userId: OUTSIDER_ID,
    });
    expect(outsiderStats.status).toBe(403);

    const outsiderRecord = await api('/billiards/record', {
      method: 'POST',
      userId: OUTSIDER_ID,
      body: {
        worldId,
        matchId: 'billiards-match-out',
        rule: '9ball',
        rackSeed: 1,
        winnerUserId: OWNER_ID,
        loserUserId: PARTNER_ID,
        reason: 'Outsider attempt',
        shots: [],
        durationSeconds: 1,
      },
    });
    expect(outsiderRecord.status).toBe(403);

    // Test SSE relay for canonical minigame_event (stamps actorUserId from x-dev-user-id)
    const abortCtrl = new AbortController();
    const sseRes = await fetch(
      `${baseUrl}/api/dev-lan/events?worldId=${encodeURIComponent(worldId)}&userId=${PARTNER_ID}&sessionId=sess-partner`,
      { signal: abortCtrl.signal },
    );
    expect(sseRes.status).toBe(200);
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();

    await api('/realtime', {
      method: 'POST',
      userId: OWNER_ID,
      body: {
        worldId,
        kind: 'minigame_event',
        sessionId: 'sess-owner',
        payload: {
          type: 'MINIGAME_EVENT',
          gameId: 'billiards',
          matchId: 'billiards-test-match',
          worldId,
          actorUserId: 'spoofed-id',
          sessionId: 'sess-owner',
          seq: 1,
          stateVersion: 0,
          payload: {
            type: 'billiards:state_request',
            payload: { requesterSlot: 0 },
          },
        },
      },
    });

    let collected = '';
    for (let i = 0; i < 6; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      collected += decoder.decode(value, { stream: true });
      if (collected.includes('event: minigame_event')) break;
    }
    abortCtrl.abort();

    expect(collected).toContain('event: minigame_event');
    expect(collected).toContain(`"actorUserId":"${OWNER_ID}"`);
    expect(collected).not.toContain('spoofed-id');
  });
});
