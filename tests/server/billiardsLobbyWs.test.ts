// @vitest-environment node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';

const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';

function connectWs(url: string) {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('WS timeout'));
    }, 5000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForFrame<T = Record<string, unknown>>(
  ws: WebSocket,
  predicate: (msg: Record<string, unknown>) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMsg);
      reject(new Error('Timed out waiting for WS frame'));
    }, timeoutMs);
    const onMsg = (raw: Buffer) => {
      const msg = JSON.parse(String(raw)) as Record<string, unknown>;
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', onMsg);
        resolve(msg as T);
      }
    };
    ws.on('message', onMsg);
  });
}

describe('Dev LAN Billiards V3 WS lobby ready check & server clock sync', () => {
  let tmpDir: string;
  let server: http.Server;
  let port: number;
  let handler: ReturnType<typeof createDevLanHandler>;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-billiards-lobby-ws-'));
    handler = createDevLanHandler({
      stateFilePath: path.join(tmpDir, 'state.json'),
      wsOptions: {
        heartbeatIntervalMs: 60_000,
        disconnectGraceMs: 250,
      },
    });
    server = http.createServer((req, res) => {
      void handler(req, res, () => {
        res.statusCode = 404;
        res.end('Not found');
      });
    });
    server.on('upgrade', (req, socket, head) => {
      if (!handler.handleUpgrade(req, socket, head)) {
        socket.destroy();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    handler.closeAll();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function sendMinigame(ws: WebSocket, worldId: string, userId: string, sessionId: string, seq: number, event: unknown) {
    ws.send(
      JSON.stringify({
        type: 'minigame_event',
        packet: {
          type: 'MINIGAME_EVENT',
          gameId: 'billiards',
          matchId: 'lobby',
          worldId,
          actorUserId: userId,
          sessionId,
          seq,
          stateVersion: 1,
          payload: event,
        },
      }),
    );
  }

  it('provides serverNowMs on welcome/pong, coordinates shared lobby ready check & countdown, and preserves in_match on disconnect', async () => {
    const seedRes = await fetch(`http://127.0.0.1:${port}/api/dev-lan/seed-couple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const seedJson = (await seedRes.json()) as { data: { world: { id: string } } };
    const worldId = seedJson.data.world.id;

    const wsA = await connectWs(`ws://127.0.0.1:${port}/api/dev-lan/ws?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-a`);
    const wsB = await connectWs(`ws://127.0.0.1:${port}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=sess-b`);

    const welcomeA = waitForFrame<{ serverNowMs?: number }>(wsA, (m) => m.type === 'welcome');
    const welcomeB = waitForFrame<{ serverNowMs?: number }>(wsB, (m) => m.type === 'welcome');

    wsA.send(JSON.stringify({
      type: 'hello', worldId, userId: MAY_ID, sessionId: 'sess-a', connectionSeq: 1,
      presence: { userId: MAY_ID, sessionId: 'sess-a', mapId: 'home', nickname: 'Mây', avatarConfig: {}, tileX: 4, tileY: 4, facing: 'down', updatedAtMs: Date.now() },
    }));
    wsB.send(JSON.stringify({
      type: 'hello', worldId, userId: NANG_ID, sessionId: 'sess-b', connectionSeq: 1,
      presence: { userId: NANG_ID, sessionId: 'sess-b', mapId: 'home', nickname: 'Nắng', avatarConfig: {}, tileX: 5, tileY: 4, facing: 'down', updatedAtMs: Date.now() },
    }));

    expect((await welcomeA).serverNowMs).toBeTypeOf('number');
    expect((await welcomeB).serverNowMs).toBeTypeOf('number');

    const pongP = waitForFrame<{ serverNowMs?: number }>(wsA, (m) => m.type === 'pong');
    wsA.send(JSON.stringify({ type: 'ping', clientSentMonoMs: 123 }));
    expect((await pongP).serverNowMs).toBeTypeOf('number');

    // Join lobby on both
    const joinDone = waitForFrame(wsB, (m) =>
      m.type === 'minigame_event' &&
      (m.packet as { payload?: { type?: string; payload?: { players?: Array<{ joined: boolean }> } } })?.payload?.type === 'billiards:lobby_state' &&
      Boolean((m.packet as { payload: { payload: { players: Array<{ joined: boolean }> } } }).payload.payload.players[0]?.joined) &&
      Boolean((m.packet as { payload: { payload: { players: Array<{ joined: boolean }> } } }).payload.payload.players[1]?.joined),
    );
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 0, edition: '3d', rule: '8ball', assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 1, assetsReady: true },
    });
    await joinDone;

    // Ready both -> server emits countdown with confirmedConfig
    const countdownP = waitForFrame<{
      packet: { payload: { payload: { status: string; confirmedConfig: { matchId: string; edition: string; startAtServerMs: number } } } };
    }>(wsA, (m) =>
      m.type === 'minigame_event' &&
      (m.packet as { payload?: { type?: string; payload?: { status?: string } } })?.payload?.type === 'billiards:lobby_state' &&
      (m.packet as { payload?: { payload?: { status?: string } } })?.payload?.payload?.status === 'countdown',
    );
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
    });
    const cd = await countdownP;
    expect(cd.packet.payload.payload.confirmedConfig.edition).toBe('3d');
    expect(cd.packet.payload.payload.confirmedConfig.startAtServerMs).toBeGreaterThan(Date.now());

    // Wait for server countdown promotion -> in_match
    const inMatchP = waitForFrame<{
      packet: { payload: { payload: { status: string; activeMatchId: string } } };
    }>(wsA, (m) =>
      m.type === 'minigame_event' &&
      (m.packet as { payload?: { type?: string; payload?: { status?: string } } })?.payload?.type === 'billiards:lobby_state' &&
      (m.packet as { payload?: { payload?: { status?: string } } })?.payload?.payload?.status === 'in_match',
    );
    const inMatch = await inMatchP;
    const activeMatchId = inMatch.packet.payload.payload.activeMatchId;
    expect(activeMatchId).toBeTruthy();

    // Disconnect B cleanly -> server MUST keep status === 'in_match' & activeMatchId!
    const discStateP = waitForFrame<{
      packet: { payload: { payload: { status: string; activeMatchId: string; players: Array<{ connected: boolean }> } } };
    }>(wsA, (m) =>
      m.type === 'minigame_event' &&
      (m.packet as { payload?: { type?: string; payload?: { players?: Array<{ connected: boolean }> } } })?.payload?.type === 'billiards:lobby_state' &&
      (m.packet as { payload: { payload: { players: Array<{ connected: boolean }> } } }).payload.payload.players[1]?.connected === false,
    );
    wsB.close(1000, 'bye');
    const discState = await discStateP;
    expect(discState.packet.payload.payload.status).toBe('in_match');
    expect(discState.packet.payload.payload.activeMatchId).toBe(activeMatchId);

    wsA.close(1000);
  });
});
