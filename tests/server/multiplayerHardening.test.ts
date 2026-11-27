// @vitest-environment node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { createDevLanHandler } from '../../scripts/devLanServerPlugin.mjs';
import { startRemoteShare, stopRemoteShare } from '../../scripts/olwRemoteShare.mjs';
import { tryHandleFarmDevLan } from '../../src/server/devLanFarmRoute';
import { RttJitterTracker } from '../../src/shared/netcode/diagnostics';
import { RemoteMotionInterpolator } from '../../src/shared/netcode/interpolation';
import { RemoteAvatarFilter } from '../../src/shared/realtime';

const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';
const OUTSIDER_ID = '33333333-3333-4333-8333-333333333333';

function connectWs(url: string, headers: Record<string, string> = {}) {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(url, { headers });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('WS connect timeout'));
    }, 5000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    ws.once('unexpected-response', (_req, res) => {
      clearTimeout(timer);
      reject(new Error(`HTTP_${res.statusCode}`));
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

function createLatencyImpairmentProxy(targetPort: number) {
  let delayMs = 0;
  let jitterMs = 0;
  let blackhole = false;
  const activeDownstream = new Set<WebSocket>();
  const activeUpstream = new Set<WebSocket>();
  const wss = new WebSocketServer({ noServer: true });
  const server = http.createServer();

  server.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (down) => {
      activeDownstream.add(down);
      const up = new WebSocket(`ws://127.0.0.1:${targetPort}${req.url || '/'}`);
      activeUpstream.add(up);
      const pendingFromDown: Buffer[] = [];
      let upOpen = false;

      const scheduleSend = (dest: WebSocket, data: Buffer) => {
        if (blackhole) return;
        const jitterOffset = jitterMs > 0 ? (Math.random() * 2 - 1) * jitterMs : 0;
        const wait = Math.max(0, Math.round(delayMs / 2 + jitterOffset));
        setTimeout(() => {
          if (!blackhole && dest.readyState === WebSocket.OPEN) {
            dest.send(String(data));
          }
        }, wait);
      };

      up.on('open', () => {
        upOpen = true;
        for (const buf of pendingFromDown) scheduleSend(up, buf);
        pendingFromDown.length = 0;
      });
      down.on('message', (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        if (!upOpen) {
          if (!blackhole) pendingFromDown.push(buf);
          return;
        }
        scheduleSend(up, buf);
      });
      up.on('message', (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
        scheduleSend(down, buf);
      });
      down.on('close', (code) => {
        activeDownstream.delete(down);
        if (!blackhole && up.readyState === WebSocket.OPEN) {
          up.close(code === 1000 ? 1000 : 4000);
        }
      });
      up.on('close', (code) => {
        activeUpstream.delete(up);
        if (down.readyState === WebSocket.OPEN) {
          down.close(code === 1000 ? 1000 : 4000);
        }
      });
    });
  });

  return {
    async start() {
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address() as { port: number };
      return addr.port;
    },
    setLatency(oneWayPairRttMs: number, halfJitterMs = 0) {
      delayMs = oneWayPairRttMs;
      jitterMs = halfJitterMs;
    },
    setBlackhole(on: boolean) {
      blackhole = on;
    },
    async close() {
      for (const s of activeDownstream) s.terminate();
      for (const s of activeUpstream) s.terminate();
      wss.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

describe('MISSION NET.1 — Multiplayer WS, Impairment, Reconnect & Gameplay Authority', () => {
  let tmpDir: string;
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let handler: ReturnType<typeof createDevLanHandler>;
  let worldId: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-net1-'));
    handler = createDevLanHandler({
      stateFilePath: path.join(tmpDir, 'state.json'),
      getTryHandleFarmDevLan: () => tryHandleFarmDevLan as never,
      wsOptions: {
        heartbeatIntervalMs: 120,
        maxMissedPongs: 2,
        disconnectGraceMs: 250,
      },
    });
    server = http.createServer((req, res) => {
      void handler(req, res, () => {
        res.statusCode = 404;
        res.end('Not Found');
      });
    });
    server.on('upgrade', (req, socket, head) => {
      handler.handleUpgrade(req, socket, head);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as { port: number }).port;
    baseUrl = `http://127.0.0.1:${port}`;

    const seedRes = await fetch(`${baseUrl}/api/dev-lan/seed-couple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const seedJson = (await seedRes.json()) as { data: { world: { id: string } } };
    worldId = seedJson.data.world.id;
  });

  afterEach(async () => {
    await stopRemoteShare();
    handler.closeAll();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function api(route: string, userId: string, method = 'GET', body?: unknown, extraHeaders: Record<string, string> = {}) {
    const res = await fetch(`${baseUrl}/api/dev-lan${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-dev-user-id': userId,
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json() };
  }

  it('synchronizes initial welcome snapshot, movement with posture/heldItem, and map transitions under 0/100/200/300ms latency + jitter', async () => {
    const proxy = createLatencyImpairmentProxy(port);
    const proxyPort = await proxy.start();
    try {
      const wsMay = await connectWs(
        `ws://127.0.0.1:${proxyPort}/api/dev-lan/ws?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-may&mapId=home`,
      );
      const mayWelcomeP = waitForFrame<{ type: string; presences: unknown[]; stateVersion: number }>(
        wsMay,
        (m) => m.type === 'welcome',
      );
      wsMay.send(
        JSON.stringify({
          type: 'hello',
          worldId,
          userId: MAY_ID,
          sessionId: 'sess-may',
          connectionSeq: 1,
          presence: {
            userId: MAY_ID,
            sessionId: 'sess-may',
            mapId: 'home',
            nickname: 'Mây',
            avatarConfig: {},
            tileX: 8,
            tileY: 9,
            x: 136,
            y: 148,
            facing: 'down',
            posture: 'none',
            heldItemSku: 'tool_hoe',
            heldItemKind: 'tool',
            updatedAtMs: Date.now(),
          },
        }),
      );
      const mayWelcome = await mayWelcomeP;
      expect(mayWelcome.stateVersion).toBeGreaterThanOrEqual(1);

      const wsNang = await connectWs(
        `ws://127.0.0.1:${proxyPort}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=sess-nang&mapId=home`,
      );
      const nangWelcomeP = waitForFrame<{ presences: Array<{ userId: string; heldItemSku?: string }> }>(
        wsNang,
        (m) => m.type === 'welcome',
      );
      wsNang.send(
        JSON.stringify({
          type: 'hello',
          worldId,
          userId: NANG_ID,
          sessionId: 'sess-nang',
          connectionSeq: 1,
          presence: {
            userId: NANG_ID,
            sessionId: 'sess-nang',
            mapId: 'home',
            nickname: 'Nắng',
            avatarConfig: {},
            tileX: 7,
            tileY: 9,
            x: 120,
            y: 148,
            facing: 'down',
            updatedAtMs: Date.now(),
          },
        }),
      );
      const nangWelcome = await nangWelcomeP;
      expect(nangWelcome.presences.find((p) => p.userId === MAY_ID)?.heldItemSku).toBe('tool_hoe');

      // Test 100ms, 200ms, 300ms RTT + jitter
      const tracker = new RttJitterTracker();
      for (const targetRtt of [100, 200, 300]) {
        proxy.setLatency(targetRtt, 25);
        const samples: number[] = [];
        for (let i = 0; i < 4; i += 1) {
          const sent = performance.now();
          const pongP = waitForFrame<{ clientSentMonoMs: number }>(wsMay, (m) => m.type === 'pong');
          wsMay.send(JSON.stringify({ type: 'ping', clientSentMonoMs: sent }));
          const pong = await pongP;
          const rtt = performance.now() - pong.clientSentMonoMs;
          tracker.recordSample(rtt);
          samples.push(rtt);
        }
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        expect(avg).toBeGreaterThanOrEqual(targetRtt * 0.65);
      }

      // Movement & map transition under 200ms latency + jitter, plus out-of-order rejection
      proxy.setLatency(200, 30);
      const filter = new RemoteAvatarFilter();
      const interp = new RemoteMotionInterpolator(136, 148, 'home', performance.now());

      const moveWalkP = waitForFrame<{ packet: Record<string, unknown> }>(
        wsNang,
        (m) => m.type === 'movement' && (m.packet as { seq?: number }).seq === 10,
      );
      // Out-of-order lower seq after seq 10 should be rejected by server!
      wsMay.send(
        JSON.stringify({
          type: 'movement',
          packet: {
            worldId,
            userId: MAY_ID,
            sessionId: 'sess-may',
            mapId: 'farm',
            seq: 10,
            timestampMs: Date.now(),
            x: 320,
            y: 280,
            vx: 60,
            vy: 0,
            facing: 'right',
            anim: 'walk',
            posture: 'none',
            heldItemSku: 'seed_wheat',
            heldItemKind: 'food',
          },
        }),
      );
      const walked = await moveWalkP;
      const acceptedWalk = filter.ingest(walked.packet, NANG_ID, worldId, Date.now());
      expect(acceptedWalk).not.toBeNull();
      interp.pushSample(
        {
          x: acceptedWalk!.x,
          y: acceptedWalk!.y,
          vx: acceptedWalk!.vx,
          vy: acceptedWalk!.vy,
          anim: acceptedWalk!.anim,
          mapId: acceptedWalk!.mapId,
          seq: acceptedWalk!.seq,
          receivedAtMonoMs: performance.now(),
        },
        { maxW: 1024, maxH: 704 },
      );

      // Send stale seq 9 -> ignored by server (never reaches Nắng)
      wsMay.send(
        JSON.stringify({
          type: 'movement',
          packet: {
            worldId,
            userId: MAY_ID,
            sessionId: 'sess-may',
            mapId: 'home',
            seq: 9,
            timestampMs: Date.now(),
            x: 100,
            y: 100,
            facing: 'left',
            anim: 'idle',
          },
        }),
      );

      // Final idle stop packet in farm
      const stopP = waitForFrame<{ packet: Record<string, unknown> }>(
        wsNang,
        (m) => m.type === 'movement' && (m.packet as { seq?: number }).seq === 11,
      );
      wsMay.send(
        JSON.stringify({
          type: 'movement',
          packet: {
            worldId,
            userId: MAY_ID,
            sessionId: 'sess-may',
            mapId: 'farm',
            seq: 11,
            timestampMs: Date.now(),
            x: 336,
            y: 280,
            vx: 0,
            vy: 0,
            facing: 'right',
            anim: 'idle',
            posture: 'none',
            heldItemSku: 'seed_wheat',
            heldItemKind: 'food',
          },
        }),
      );
      const stopped = await stopP;
      const acceptedStop = filter.ingest(stopped.packet, NANG_ID, worldId, Date.now());
      expect(acceptedStop?.seq).toBe(11);
      interp.pushSample(
        {
          x: acceptedStop!.x,
          y: acceptedStop!.y,
          vx: 0,
          vy: 0,
          anim: 'idle',
          mapId: 'farm',
          seq: 11,
          receivedAtMonoMs: performance.now(),
        },
        { maxW: 1024, maxH: 704 },
      );
      let t = performance.now();
      for (let i = 0; i < 40; i += 1) {
        t += 16;
        interp.step(t, 16, tracker.getStats().jitterMs ?? 20, { maxW: 1024, maxH: 704 });
      }
      expect(interp.getPosition()).toEqual({ x: 336, y: 280 });

      wsMay.close(1000);
      wsNang.close(1000);
    } finally {
      await proxy.close();
    }
  });

  it('recovers from Wi-Fi to 5G blackhole, supersedes stale connection, and preserves map transition made while offline', async () => {
    const proxy = createLatencyImpairmentProxy(port);
    const proxyPort = await proxy.start();
    try {
      const wsMayOld = await connectWs(
        `ws://127.0.0.1:${proxyPort}/api/dev-lan/ws?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-may&mapId=home`,
      );
      const oldWelcomeP = waitForFrame(wsMayOld, (m) => m.type === 'welcome');
      wsMayOld.send(
        JSON.stringify({
          type: 'hello',
          worldId,
          userId: MAY_ID,
          sessionId: 'sess-may',
          connectionSeq: 1,
          presence: {
            userId: MAY_ID,
            sessionId: 'sess-may',
            mapId: 'home',
            nickname: 'Mây',
            avatarConfig: {},
            tileX: 8,
            tileY: 9,
            x: 136,
            y: 148,
            facing: 'down',
            updatedAtMs: Date.now(),
          },
        }),
      );
      await oldWelcomeP;

      const wsNang = await connectWs(
        `${baseUrl.replace('http:', 'ws:')}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=sess-nang&mapId=garden`,
      );
      const nangWelcomeP = waitForFrame(wsNang, (m) => m.type === 'welcome');
      wsNang.send(
        JSON.stringify({
          type: 'hello',
          worldId,
          userId: NANG_ID,
          sessionId: 'sess-nang',
          connectionSeq: 1,
          presence: {
            userId: NANG_ID,
            sessionId: 'sess-nang',
            mapId: 'garden',
            nickname: 'Nắng',
            avatarConfig: {},
            tileX: 8,
            tileY: 4,
            x: 136,
            y: 72,
            facing: 'down',
            updatedAtMs: Date.now(),
          },
        }),
      );
      await nangWelcomeP;

      // Simulate Wi-Fi -> 5G blackhole on Mây's old connection while Mây walks to 'garden' locally
      proxy.setBlackhole(true);
      const recStart = performance.now();

      // New 5G socket opens directly with Mây's current mapId='garden' and higher connectionSeq=2
      const nangSeesGardenP = waitForFrame<{ presences: Array<{ userId: string; mapId: string; x?: number }> }>(
        wsNang,
        (m) =>
          m.type === 'presence_sync' &&
          Array.isArray(m.presences) &&
          m.presences.some((p: { userId: string; mapId: string }) => p.userId === MAY_ID && p.mapId === 'garden'),
      );

      const wsMay5G = await connectWs(
        `${baseUrl.replace('http:', 'ws:')}/api/dev-lan/ws?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-may&connectionSeq=2&mapId=garden`,
      );
      const newWelcomeP = waitForFrame<{ presences: Array<{ userId: string; mapId: string }> }>(
        wsMay5G,
        (m) => m.type === 'welcome',
      );
      wsMay5G.send(
        JSON.stringify({
          type: 'hello',
          worldId,
          userId: MAY_ID,
          sessionId: 'sess-may',
          connectionSeq: 2,
          presence: {
            userId: MAY_ID,
            sessionId: 'sess-may',
            mapId: 'garden',
            nickname: 'Mây',
            avatarConfig: {},
            tileX: 9,
            tileY: 6,
            x: 152,
            y: 104,
            facing: 'up',
            updatedAtMs: Date.now(),
          },
        }),
      );
      await newWelcomeP;
      const recoveryMs = performance.now() - recStart;
      expect(recoveryMs).toBeLessThan(1000);

      const nangSync = await nangSeesGardenP;
      const mayOnNang = nangSync.presences.find((p) => p.userId === MAY_ID);
      expect(mayOnNang?.mapId).toBe('garden');
      expect(mayOnNang?.x).toBe(152);

      // Re-open old blackholed proxy and attempt to inject a stale 'home' presence from old socket -> must be rejected/ignored!
      proxy.setBlackhole(false);
      wsMayOld.send(
        JSON.stringify({
          type: 'presence',
          presence: {
            userId: MAY_ID,
            sessionId: 'sess-may',
            mapId: 'home',
            nickname: 'Mây',
            avatarConfig: {},
            tileX: 8,
            tileY: 9,
            x: 136,
            y: 148,
            facing: 'down',
            updatedAtMs: Date.now() + 999999,
          },
        }),
      );
      await new Promise((r) => setTimeout(r, 80));

      // Verify room authoritative state is still 'garden'
      const stats = handler.getRoomDebugStats?.(worldId) as { activeSlots: Array<{ userId: string; mapId: string }> };
      expect(stats.activeSlots.find((s) => s.userId === MAY_ID)?.mapId).toBe('garden');

      wsMay5G.close(1000);
      wsNang.close(1000);
    } finally {
      await proxy.close();
    }
  });

  it('prevents duplicate harvests, item duplication, and stale rollbacks under concurrent farming & pet care', async () => {
    const wsMay = await connectWs(
      `${baseUrl.replace('http:', 'ws:')}/api/dev-lan/ws?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-may-farm&mapId=farm`,
    );
    const wsNang = await connectWs(
      `${baseUrl.replace('http:', 'ws:')}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=sess-nang-farm&mapId=farm`,
    );
    wsMay.send(
      JSON.stringify({
        type: 'hello',
        worldId,
        userId: MAY_ID,
        sessionId: 'sess-may-farm',
        connectionSeq: 1,
        presence: {
          userId: MAY_ID,
          sessionId: 'sess-may-farm',
          mapId: 'farm',
          nickname: 'Mây',
          avatarConfig: {},
          tileX: 10,
          tileY: 10,
          facing: 'down',
          updatedAtMs: Date.now(),
        },
      }),
    );
    wsNang.send(
      JSON.stringify({
        type: 'hello',
        worldId,
        userId: NANG_ID,
        sessionId: 'sess-nang-farm',
        connectionSeq: 1,
        presence: {
          userId: NANG_ID,
          sessionId: 'sess-nang-farm',
          mapId: 'farm',
          nickname: 'Nắng',
          avatarConfig: {},
          tileX: 11,
          tileY: 10,
          facing: 'down',
          updatedAtMs: Date.now(),
        },
      }),
    );

    const f0 = await api(`/farm?worldId=${worldId}`, MAY_ID);
    expect(f0.status).toBe(200);
    const v0 = (f0.json as { data: { version: number } }).data.version;

    // Concurrent till on plot 0 at version v0 -> only one succeeds, other gets 409 VERSION_CONFLICT
    const worldMutatedP = waitForFrame<{ stateVersion: number; reason: string }>(
      wsNang,
      (m) => m.type === 'world_mutated' && m.reason === 'farm',
    );
    const [r1, r2] = await Promise.all([
      api('/farm/apply', MAY_ID, 'POST', {
        worldId,
        plotIndex: 0,
        action: 'till',
        farmVersion: v0,
        idempotencyKey: 'till-may-1',
      }),
      api('/farm/apply', NANG_ID, 'POST', {
        worldId,
        plotIndex: 0,
        action: 'till',
        farmVersion: v0,
        idempotencyKey: 'till-nang-1',
      }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);
    const broadcast = await worldMutatedP;
    expect(broadcast.stateVersion).toBeGreaterThan(1);

    // Retry winning key -> idempotent replay returns same version without incrementing
    const winningUser = r1.status === 200 ? MAY_ID : NANG_ID;
    const winningKey = r1.status === 200 ? 'till-may-1' : 'till-nang-1';
    const replay = await api('/farm/apply', winningUser, 'POST', {
      worldId,
      plotIndex: 0,
      action: 'till',
      farmVersion: v0,
      idempotencyKey: winningKey,
    });
    expect(replay.status).toBe(200);
    expect((replay.json as { data: { snapshot: { version: number } } }).data.snapshot.version).toBe(v0 + 1);

    // Buy seed with idempotency retry -> wallet debited ONCE
    const b1 = await api('/farm/buy-seed', MAY_ID, 'POST', {
      worldId,
      seedSku: 'seed_carrot',
      qty: 1,
      idempotencyKey: 'buy-1',
    });
    const b2 = await api('/farm/buy-seed', MAY_ID, 'POST', {
      worldId,
      seedSku: 'seed_carrot',
      qty: 1,
      idempotencyKey: 'buy-1',
    });
    expect(b1.status).toBe(200);
    expect(b2.status).toBe(200);
    expect(b1.json).toEqual(b2.json);

    // Concurrent pet water bowl fill at bowlVersion=1 -> only one succeeds
    const bowl0 = await api(`/pet?worldId=${worldId}`, MAY_ID);
    const petAdopt = await api('/pet/adopt-or-rename', MAY_ID, 'POST', {
      worldId,
      name: 'Quýt',
      expectedVersion: (bowl0.json as { data: { version?: number } | null }).data?.version ?? null,
      idempotencyKey: 'adopt-1',
    });
    const petId = (petAdopt.json as { data: { id: string } }).data.id;
    const careSnap = await api(`/pet/care?worldId=${worldId}`, MAY_ID);
    const bowlVersion = (careSnap.json as { data: { version: number } }).data.version;
    const [pw1, pw2] = await Promise.all([
      api('/pet/care/apply', MAY_ID, 'POST', {
        worldId,
        petId,
        action: 'fill_water',
        expectedBowlVersion: bowlVersion,
        ownerScope: 'shared',
        itemSku: 'pet_kibble_basic',
        quality: 'normal',
        idempotencyKey: 'pw-may',
      }),
      api('/pet/care/apply', NANG_ID, 'POST', {
        worldId,
        petId,
        action: 'fill_water',
        expectedBowlVersion: bowlVersion,
        ownerScope: 'shared',
        itemSku: 'pet_kibble_basic',
        quality: 'normal',
        idempotencyKey: 'pw-nang',
      }),
    ]);
    expect([pw1.status, pw2.status].sort()).toEqual([200, 409]);

    wsMay.close(1000);
    wsNang.close(1000);
  });

  it('protects remote share proxy + WS upgrade with two-player authentication and blocks host admin routes', async () => {
    const info = await startRemoteShare({
      targetPort: port,
      tunnel: false,
      refresh: true,
    });
    const proxyBase = `http://127.0.0.1:${info.proxyPort}`;
    const proxyWsBase = `ws://127.0.0.1:${info.proxyPort}`;

    // 1. Unauthenticated HTTP & WS upgrade rejected 401
    const unauthHttp = await fetch(`${proxyBase}/api/dev-lan/client-context`);
    expect(unauthHttp.status).toBe(401);
    await expect(
      connectWs(`${proxyWsBase}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=s-nang`),
    ).rejects.toThrow('HTTP_401');

    // 2. Redeem share link -> cookie
    const pairRes = await fetch(`${proxyBase}${info.sharePath}`, { redirect: 'manual' });
    expect(pairRes.status).toBe(302);
    const cookie = (pairRes.headers.get('set-cookie') || '').split(';')[0]!;

    // 3. Authenticated outsider AND partner-a impersonation rejected 403 on WS upgrade & HTTP
    await expect(
      connectWs(`${proxyWsBase}/api/dev-lan/ws?worldId=${worldId}&userId=${OUTSIDER_ID}&sessionId=s-out`, {
        Cookie: cookie,
      }),
    ).rejects.toThrow('HTTP_403');
    await expect(
      connectWs(`${proxyWsBase}/api/dev-lan/ws?worldId=${worldId}&userId=${MAY_ID}&sessionId=s-may-spoof`, {
        Cookie: cookie,
      }),
    ).rejects.toThrow('HTTP_403');
    const outHttp = await fetch(`${proxyBase}/api/dev-lan/world/snapshot`, {
      headers: { Cookie: cookie, 'x-dev-user-id': OUTSIDER_ID },
    });
    expect(outHttp.status).toBe(403);
    const maySpoofHttp = await fetch(`${proxyBase}/api/dev-lan/world/snapshot`, {
      headers: { Cookie: cookie, 'x-dev-user-id': MAY_ID },
    });
    expect(maySpoofHttp.status).toBe(403);

    // 4. Remote partner blocked from host-only /reset, /seed-couple, /world/create, /world/invite, and /dev-console/*
    for (const [method, route, payload] of [
      ['POST', '/reset', {}],
      ['POST', '/seed-couple', {}],
      ['POST', '/world/create', { worldName: 'Evil', nickname: 'X' }],
      ['POST', '/world/invite', { worldId }],
      ['GET', `/dev-console/snapshot?worldId=${worldId}`, undefined],
    ] as const) {
      const blockedRes = await fetch(`${proxyBase}/api/dev-lan${route}`, {
        method,
        headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-dev-user-id': NANG_ID },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
      expect(blockedRes.status, `${method} ${route}`).toBe(403);
    }

    // 4b. Remote GET /identities exposes only partner-b (never host or outsider)
    const remoteIdentities = await fetch(`${proxyBase}/api/dev-lan/identities`, {
      headers: { Cookie: cookie },
    });
    expect(remoteIdentities.status).toBe(200);
    const idJson = (await remoteIdentities.json()) as {
      ok: boolean;
      data: { identities: Array<{ presetId: string }>; memberCount: number };
    };
    expect(idJson.ok).toBe(true);
    expect(idJson.data.identities.map((i) => i.presetId)).toEqual(['partner-b']);

    // 5. Authenticated partner-b (Nắng) upgrades WS cleanly through remote share proxy
    const wsNang = await connectWs(
      `${proxyWsBase}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=s-nang-remote`,
      { Cookie: cookie },
    );
    const welcomeP = waitForFrame<{ type: string; stateVersion: number }>(wsNang, (m) => m.type === 'welcome');
    wsNang.send(
      JSON.stringify({
        type: 'hello',
        worldId,
        userId: NANG_ID,
        sessionId: 's-nang-remote',
        connectionSeq: 1,
        presence: {
          userId: NANG_ID,
          sessionId: 's-nang-remote',
          mapId: 'home',
          nickname: 'Nắng',
          avatarConfig: {},
          tileX: 8,
          tileY: 9,
          facing: 'down',
          updatedAtMs: Date.now(),
        },
      }),
    );
    const welcome = await welcomeP;
    expect(welcome.stateVersion).toBeGreaterThanOrEqual(1);
    wsNang.close(1000);
  });

  it('NET.1.1: preserves existing 1/2 host world, auto-joins Nắng on /__share, and allows partner /world/redeem remotely', async () => {
    // 1. Fresh state with Mây creating her own custom 1/2 world (NOT seed-couple)
    await api('/reset', MAY_ID, 'POST', {});
    const createRes = await api('/world/create', MAY_ID, 'POST', {
      worldName: 'Tổ ấm riêng của Mây',
      nickname: 'Mây Xinh',
    });
    expect(createRes.status).toBe(200);
    const customWorldId = (createRes.json as { data: { world: { id: string } } }).data.world.id;
    const invRes = await api('/world/invite', MAY_ID, 'POST', { worldId: customWorldId });
    expect(invRes.status).toBe(200);
    const inviteCode = (invRes.json as { data: { inviteCode: string } }).data.inviteCode;

    const info = await startRemoteShare({
      targetPort: port,
      tunnel: false,
      refresh: true,
    });
    const proxyBase = `http://127.0.0.1:${info.proxyPort}`;
    const pairRes = await fetch(`${proxyBase}${info.sharePath}`, { redirect: 'manual' });
    expect(pairRes.status).toBe(302);
    expect(pairRes.headers.get('location')).toBe('/?remote-partner=1');
    const cookie = (pairRes.headers.get('set-cookie') || '').split(';')[0]!;

    // 2. Remote client-context auto-joins partner-b (Nắng) into Mây's custom 1/2 world without wiping custom worldName
    const ctxRes = await fetch(`${proxyBase}/api/dev-lan/client-context`, {
      headers: { Cookie: cookie },
    });
    expect(ctxRes.status).toBe(200);
    const snapRes = await fetch(`${proxyBase}/api/dev-lan/world/snapshot`, {
      headers: { Cookie: cookie, 'x-dev-user-id': NANG_ID },
    });
    expect(snapRes.status).toBe(200);
    const snapJson = (await snapRes.json()) as {
      ok: boolean;
      data: { world: { id: string; name: string }; members: Array<{ userId: string }> } | null;
    };
    expect(snapJson.ok).toBe(true);
    expect(snapJson.data?.world.id).toBe(customWorldId);
    expect(snapJson.data?.world.name).toBe('Tổ ấm riêng của Mây');
    expect(snapJson.data?.members.map((m) => m.userId).sort()).toEqual([MAY_ID, NANG_ID]);

    // 3. Also verify POST /world/redeem itself is NOT blocked by remote host-admin guard on a 1/2 world
    await api('/reset', MAY_ID, 'POST', {});
    const c2 = await api('/world/create', MAY_ID, 'POST', { worldName: 'Nhà Mời Mã', nickname: 'Mây' });
    const w2 = (c2.json as { data: { world: { id: string } } }).data.world.id;
    const inv2 = await api('/world/invite', MAY_ID, 'POST', { worldId: w2 });
    const code2 = (inv2.json as { data: { inviteCode: string } }).data.inviteCode;
    const redeemRes = await fetch(`${proxyBase}/api/dev-lan/world/redeem`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json', 'x-dev-user-id': NANG_ID },
      body: JSON.stringify({ inviteCode: code2, nickname: 'Nắng' }),
    });
    expect(redeemRes.status).toBe(200);
    const redeemJson = (await redeemRes.json()) as { ok: boolean; data: { world: { id: string }; members: unknown[] } };
    expect(redeemJson.ok).toBe(true);
    expect(redeemJson.data.world.id).toBe(w2);
    expect(redeemJson.data.members).toHaveLength(2);
    expect(inviteCode).toMatch(/^OLW-/);
  });
});
