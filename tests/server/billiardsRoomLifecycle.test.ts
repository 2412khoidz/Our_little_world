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

interface WireLobbyMessage {
  type?: string;
  packet?: {
    type?: string;
    payload?: {
      type?: string;
      payload?: {
        lobbyId?: string;
        status?: string;
        activeMatchId?: string | null;
        confirmedConfig?: {
          matchId?: string;
          startingPlayer?: number;
          matchSeq?: number;
          scores?: [number, number];
          edition?: string;
          startAtServerMs?: number;
        } | null;
        players?: Array<{ joined?: boolean; ready?: boolean; connected?: boolean }>;
      };
    };
  };
}

function asLobbyMsg(m: Record<string, unknown>): WireLobbyMessage {
  return m as unknown as WireLobbyMessage;
}

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
      try {
        const msg = JSON.parse(String(raw)) as Record<string, unknown>;
        if (predicate(msg)) {
          clearTimeout(timer);
          ws.off('message', onMsg);
          resolve(msg as T);
        }
      } catch {
        // ignore unparseable frame
      }
    };
    ws.on('message', onMsg);
  });
}

function sendMinigame(
  ws: WebSocket,
  worldId: string,
  userId: string,
  sessionId: string,
  seq: number,
  event: unknown,
) {
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

describe('HOTFIX-BILLIARDS-01: Room Lifecycle, Rematch Recovery & Timer Safety', () => {
  let tmpDir: string;
  let server: http.Server;
  let port: number;
  let handler: ReturnType<typeof createDevLanHandler>;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-billiards-lifecycle-'));
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

  async function seedAndConnectPair() {
    const seedRes = await fetch(`http://127.0.0.1:${port}/api/dev-lan/seed-couple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const seedJson = (await seedRes.json()) as { data: { world: { id: string } } };
    const worldId = seedJson.data.world.id;

    const wsA = await connectWs(
      `ws://127.0.0.1:${port}/api/dev-lan/ws?worldId=${worldId}&userId=${MAY_ID}&sessionId=sess-a`,
    );
    const wsB = await connectWs(
      `ws://127.0.0.1:${port}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=sess-b`,
    );

    const welcomeA = waitForFrame(wsA, (m) => m.type === 'welcome');
    const welcomeB = waitForFrame(wsB, (m) => m.type === 'welcome');

    wsA.send(
      JSON.stringify({
        type: 'hello',
        worldId,
        userId: MAY_ID,
        sessionId: 'sess-a',
        connectionSeq: 1,
        presence: {
          userId: MAY_ID,
          sessionId: 'sess-a',
          mapId: 'home',
          nickname: 'Mây',
          avatarConfig: {},
          tileX: 4,
          tileY: 4,
          facing: 'down',
          updatedAtMs: Date.now(),
        },
      }),
    );
    wsB.send(
      JSON.stringify({
        type: 'hello',
        worldId,
        userId: NANG_ID,
        sessionId: 'sess-b',
        connectionSeq: 1,
        presence: {
          userId: NANG_ID,
          sessionId: 'sess-b',
          mapId: 'home',
          nickname: 'Nắng',
          avatarConfig: {},
          tileX: 5,
          tileY: 4,
          facing: 'down',
          updatedAtMs: Date.now(),
        },
      }),
    );

    await Promise.all([welcomeA, welcomeB]);
    return { worldId, wsA, wsB };
  }

  it('Scenario 1 & 2: Match completion marks match FINISHED, sets room status to lobby with null activeMatchId, preventing false unfinished match banner', async () => {
    const { worldId, wsA, wsB } = await seedAndConnectPair();

    // 1. Join lobby
    const joinedP = waitForFrame(wsB, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        Boolean(lm.packet.payload.payload?.players?.[0]?.joined) &&
        Boolean(lm.packet.payload.payload?.players?.[1]?.joined)
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 0, edition: '2d', rule: '8ball', assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 1, assetsReady: true },
    });
    await joinedP;

    // 2. Both ready -> countdown
    const cdP = waitForFrame<{
      packet: { payload: { payload: { status: string; confirmedConfig: { matchId: string } } } };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'countdown'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
    });
    const cd = await cdP;
    const matchId = cd.packet.payload.payload.confirmedConfig.matchId;

    // 3. Promote to in_match
    const inMatchP = waitForFrame<{
      packet: { payload: { payload: { status: string; activeMatchId: string } } };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'in_match'
      );
    });
    const inMatch = await inMatchP;
    expect(inMatch.packet.payload.payload.status).toBe('in_match');
    expect(inMatch.packet.payload.payload.activeMatchId).toBe(matchId);

    // 4. Match completes -> send billiards:settled with winner
    const finishedLobbyP = waitForFrame<{
      packet: {
        payload: {
          payload: {
            status: string;
            activeMatchId: string | null;
            confirmedConfig: { scores: [number, number] } | null;
          };
        };
      };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'lobby'
      );
    });

    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 3, {
      type: 'billiards:settled',
      payload: {
        matchId,
        matchSeq: 1,
        kind: 'shot_settled',
        actorSlot: 0,
        shotIndex: 5,
        stateVersion: 10,
        nextShotSeq: 6,
        balls: [],
        groups: ['solid', 'stripe'],
        nextPlayer: 0,
        ballInHand: false,
        isBreakShot: false,
        turnDeadlineMs: Date.now() + 30000,
        turnRemainingMs: 30000,
        returnedIds: [],
        scores: [1, 0],
        winner: { winnerSlot: 0, reason: 'eight_ball_sunk', summary: 'Mây thắng' },
      },
    });

    const finishedLobby = await finishedLobbyP;
    // Authorized server transitioned status to 'lobby' and invalidated activeMatchId
    expect(finishedLobby.packet.payload.payload.status).toBe('lobby');
    expect(finishedLobby.packet.payload.payload.activeMatchId).toBeNull();

    // 5. Query state on menu/lobby re-entry -> verify activeMatchId is null so no false "unfinished match" banner is shown!
    const syncP = waitForFrame<{
      packet: { payload: { payload: { status: string; activeMatchId: string | null } } };
    }>(wsB, (m) => {
      const lm = asLobbyMsg(m);
      return lm.type === 'minigame_event' && lm.packet?.payload?.type === 'billiards:lobby_state';
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 3, {
      type: 'billiards:lobby_sync_request',
      payload: {},
    });
    const syncState = await syncP;
    expect(syncState.packet.payload.payload.status).toBe('lobby');
    expect(syncState.packet.payload.payload.activeMatchId).toBeNull();

    wsA.close(1000);
    wsB.close(1000);
  });

  it('Scenario 3, 4 & 5: Rematches preserve exact same room ID across 5 consecutive matches, alternate break, track cumulative scores, and guard against duplicate rematch requests', async () => {
    const { worldId, wsA, wsB } = await seedAndConnectPair();

    // Join
    const joinedP = waitForFrame(wsB, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        Boolean(lm.packet.payload.payload?.players?.[0]?.joined) &&
        Boolean(lm.packet.payload.payload?.players?.[1]?.joined)
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 1, {
      type: 'billiards:lobby_join',
      payload: {
        playerSlot: 0,
        edition: '2d',
        rule: '8ball',
        startingPlayer: 0,
        hasExplicitStartingPlayer: true,
        assetsReady: true,
      },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 1, assetsReady: true },
    });
    await joinedP;

    // Start match 1 via ready check
    const cd1P = waitForFrame<{
      packet: {
        payload: {
          payload: {
            lobbyId: string;
            status: string;
            confirmedConfig: { matchId: string; startingPlayer: number };
          };
        };
      };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'countdown'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
    });
    const cd1 = await cd1P;
    const initialLobbyId = cd1.packet.payload.payload.lobbyId;
    let currentMatchId = cd1.packet.payload.payload.confirmedConfig.matchId;
    let expectedStarter = 0;
    expect(cd1.packet.payload.payload.confirmedConfig.startingPlayer).toBe(expectedStarter);

    // Settle Match 1
    const settle1P = waitForFrame(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'lobby'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 3, {
      type: 'billiards:settled',
      payload: {
        matchId: currentMatchId,
        matchSeq: 1,
        kind: 'shot_settled',
        actorSlot: 0,
        shotIndex: 1,
        stateVersion: 2,
        nextShotSeq: 2,
        balls: [],
        groups: ['solid', 'stripe'],
        nextPlayer: 0,
        ballInHand: false,
        isBreakShot: false,
        turnDeadlineMs: Date.now() + 30000,
        turnRemainingMs: 30000,
        returnedIds: [],
        scores: [1, 0],
        winner: { winnerSlot: 0, reason: 'eight_ball_sunk' },
      },
    });
    await settle1P;

    // Play 4 subsequent rematches (total 5 matches)
    for (let matchIndex = 2; matchIndex <= 5; matchIndex++) {
      expectedStarter = expectedStarter === 0 ? 1 : 0; // Alternates break player!

      const nextCountdownP = waitForFrame<{
        packet: {
          payload: {
            payload: {
              lobbyId: string;
              status: string;
              confirmedConfig: {
                matchId: string;
                startingPlayer: number;
                matchSeq: number;
                scores: [number, number];
              };
            };
          };
        };
      }>(wsA, (m) => {
        const lm = asLobbyMsg(m);
        return (
          lm.type === 'minigame_event' &&
          lm.packet?.payload?.type === 'billiards:lobby_state' &&
          lm.packet.payload.payload?.status === 'countdown'
        );
      });

      // Scenario 5: Both players send rematch requests (even rapidly/simultaneously)
      sendMinigame(wsA, worldId, MAY_ID, 'sess-a', matchIndex * 10, {
        type: 'billiards:lobby_rematch',
        payload: { playerSlot: 0, matchId: currentMatchId, wantRematch: true },
      });
      // Double click from player 0
      sendMinigame(wsA, worldId, MAY_ID, 'sess-a', matchIndex * 10 + 1, {
        type: 'billiards:lobby_rematch',
        payload: { playerSlot: 0, matchId: currentMatchId, wantRematch: true },
      });
      // Player 1 rematch
      sendMinigame(wsB, worldId, NANG_ID, 'sess-b', matchIndex * 10, {
        type: 'billiards:lobby_rematch',
        payload: { playerSlot: 1, matchId: currentMatchId, wantRematch: true },
      });

      const nextCd = await nextCountdownP;
      // Room identity remains stable!
      expect(nextCd.packet.payload.payload.lobbyId).toBe(initialLobbyId);
      // Starting player alternated!
      expect(nextCd.packet.payload.payload.confirmedConfig.startingPlayer).toBe(expectedStarter);
      // Cumulative match sequence incremented
      expect(nextCd.packet.payload.payload.confirmedConfig.matchSeq).toBe(matchIndex);
      // Scores preserved
      expect(nextCd.packet.payload.payload.confirmedConfig.scores[0]).toBeGreaterThanOrEqual(1);

      currentMatchId = nextCd.packet.payload.payload.confirmedConfig.matchId;

      // Settle this match
      const settleNextP = waitForFrame(wsA, (m) => {
        const lm = asLobbyMsg(m);
        return (
          lm.type === 'minigame_event' &&
          lm.packet?.payload?.type === 'billiards:lobby_state' &&
          lm.packet.payload.payload?.status === 'lobby'
        );
      });
      sendMinigame(wsA, worldId, MAY_ID, 'sess-a', matchIndex * 10 + 5, {
        type: 'billiards:settled',
        payload: {
          matchId: currentMatchId,
          matchSeq: matchIndex,
          kind: 'shot_settled',
          actorSlot: expectedStarter,
          shotIndex: 1,
          stateVersion: 2,
          nextShotSeq: 2,
          balls: [],
          groups: ['solid', 'stripe'],
          nextPlayer: expectedStarter,
          ballInHand: false,
          isBreakShot: false,
          turnDeadlineMs: Date.now() + 30000,
          turnRemainingMs: 30000,
          returnedIds: [],
          scores: [matchIndex % 2 === 1 ? 2 : 1, matchIndex % 2 === 0 ? 2 : 1],
          winner: { winnerSlot: expectedStarter, reason: 'eight_ball_sunk' },
        },
      });
      await settleNextP;
    }

    wsA.close(1000);
    wsB.close(1000);
  });

  it('Scenario 6: Match finished via scratch on 8-ball or forfeit settles immediately', async () => {
    const { worldId, wsA, wsB } = await seedAndConnectPair();

    // Fast setup to in_match
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 0, edition: '2d', rule: '8ball', assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 1, assetsReady: true },
    });
    const cdP = waitForFrame<{
      packet: { payload: { payload: { confirmedConfig: { matchId: string } } } };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'countdown'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
    });
    const matchId = (await cdP).packet.payload.payload.confirmedConfig.matchId;

    // Send scratch_on_eight settlement
    const settledP = waitForFrame<{
      packet: { payload: { payload: { status: string; activeMatchId: string | null } } };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'lobby'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 3, {
      type: 'billiards:settled',
      payload: {
        matchId,
        matchSeq: 1,
        kind: 'shot_settled',
        actorSlot: 0,
        shotIndex: 3,
        stateVersion: 5,
        nextShotSeq: 4,
        balls: [],
        groups: ['solid', 'stripe'],
        nextPlayer: 1,
        ballInHand: false,
        isBreakShot: false,
        turnDeadlineMs: Date.now() + 30000,
        turnRemainingMs: 30000,
        returnedIds: [],
        scores: [0, 1],
        winner: { winnerSlot: 1, reason: 'scratch_on_eight', summary: 'Nắng thắng (Mây phạm quy bi 8)' },
      },
    });

    const res = await settledP;
    expect(res.packet.payload.payload.status).toBe('lobby');
    expect(res.packet.payload.payload.activeMatchId).toBeNull();

    wsA.close(1000);
    wsB.close(1000);
  });

  it('Scenario 7: Player disconnect during countdown properly cancels countdown timer without crash', async () => {
    const { worldId, wsA, wsB } = await seedAndConnectPair();

    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 0, edition: '2d', rule: '8ball', assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 1, assetsReady: true },
    });

    const cdP = waitForFrame(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'countdown'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
    });
    await cdP;

    // Disconnect wsB during countdown
    const cancelP = waitForFrame<{
      packet: { payload: { payload: { status: string; activeMatchId: string | null } } };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'lobby'
      );
    });
    wsB.close(1000, 'abrupt disconnect during countdown');

    const cancelledState = await cancelP;
    expect(cancelledState.packet.payload.payload.status).toBe('lobby');
    expect(cancelledState.packet.payload.payload.activeMatchId).toBeNull();

    wsA.close(1000);
  });

  it('Scenario 8: Player reconnect after match completion receives correct room state', async () => {
    const { worldId, wsA, wsB } = await seedAndConnectPair();

    // Settle a match
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 0, edition: '2d', rule: '8ball', assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 1, assetsReady: true },
    });
    const cdP = waitForFrame<{
      packet: { payload: { payload: { confirmedConfig: { matchId: string } } } };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'countdown'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
    });
    sendMinigame(wsB, worldId, NANG_ID, 'sess-b', 2, {
      type: 'billiards:lobby_ready',
      payload: { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
    });
    const matchId = (await cdP).packet.payload.payload.confirmedConfig.matchId;

    // Settle match
    const settleP = waitForFrame(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'lobby'
      );
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 3, {
      type: 'billiards:settled',
      payload: {
        matchId,
        matchSeq: 1,
        kind: 'shot_settled',
        actorSlot: 0,
        shotIndex: 1,
        stateVersion: 2,
        nextShotSeq: 2,
        balls: [],
        groups: ['solid', 'stripe'],
        nextPlayer: 0,
        ballInHand: false,
        isBreakShot: false,
        turnDeadlineMs: Date.now() + 30000,
        turnRemainingMs: 30000,
        returnedIds: [],
        scores: [1, 0],
        winner: { winnerSlot: 0, reason: 'eight_ball_sunk' },
      },
    });
    await settleP;

    // Close wsB then reconnect as a new session
    wsB.close(1000);

    const wsB2 = await connectWs(
      `ws://127.0.0.1:${port}/api/dev-lan/ws?worldId=${worldId}&userId=${NANG_ID}&sessionId=sess-b2`,
    );
    const welcomeB2 = waitForFrame(wsB2, (m) => m.type === 'welcome');
    wsB2.send(
      JSON.stringify({
        type: 'hello',
        worldId,
        userId: NANG_ID,
        sessionId: 'sess-b2',
        connectionSeq: 1,
        presence: {
          userId: NANG_ID,
          sessionId: 'sess-b2',
          mapId: 'home',
          nickname: 'Nắng',
          avatarConfig: {},
          tileX: 5,
          tileY: 4,
          facing: 'down',
          updatedAtMs: Date.now(),
        },
      }),
    );
    await welcomeB2;

    const syncStateP = waitForFrame<{
      packet: { payload: { payload: { status: string; activeMatchId: string | null } } };
    }>(wsB2, (m) => {
      const lm = asLobbyMsg(m);
      return lm.type === 'minigame_event' && lm.packet?.payload?.type === 'billiards:lobby_state';
    });
    sendMinigame(wsB2, worldId, NANG_ID, 'sess-b2', 1, {
      type: 'billiards:lobby_sync_request',
      payload: {},
    });
    const state = await syncStateP;
    expect(state.packet.payload.payload.status).toBe('lobby');
    expect(state.packet.payload.payload.activeMatchId).toBeNull();

    wsA.close(1000);
    wsB2.close(1000);
  });

  it('Scenario 9, 10 & 11: "Create new room" generates distinct room ID without ReferenceError: clearCountdownToLobby and preserves server safety', async () => {
    const { worldId, wsA, wsB } = await seedAndConnectPair();

    // Join initial lobby
    const joinedP = waitForFrame<{ packet: { payload: { payload: { lobbyId: string } } } }>(
      wsA,
      (m) => {
        const lm = asLobbyMsg(m);
        return (
          lm.type === 'minigame_event' &&
          lm.packet?.payload?.type === 'billiards:lobby_state' &&
          Boolean(lm.packet.payload.payload?.players?.[0]?.joined)
        );
      },
    );
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 1, {
      type: 'billiards:lobby_join',
      payload: { playerSlot: 0, edition: '2d', rule: '8ball', assetsReady: true },
    });
    const joined = await joinedP;
    const initialLobbyId = joined.packet.payload.payload.lobbyId;

    // Send "new_lobby" (this previously crashed with ReferenceError: clearCountdownToLobby is not defined)
    const newRoomStateP = waitForFrame<{
      packet: {
        payload: {
          payload: {
            lobbyId: string;
            status: string;
            activeMatchId: string | null;
            confirmedConfig: unknown;
          };
        };
      };
    }>(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return (
        lm.type === 'minigame_event' &&
        lm.packet?.payload?.type === 'billiards:lobby_state' &&
        lm.packet.payload.payload?.status === 'lobby' &&
        lm.packet.payload.payload?.lobbyId !== initialLobbyId
      );
    });

    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 2, {
      type: 'billiards:lobby_leave',
      payload: { playerSlot: 0, reason: 'new_lobby' },
    });

    const newRoomState = await newRoomStateP;
    // Distinct room ID generated
    expect(newRoomState.packet.payload.payload.lobbyId).not.toBe(initialLobbyId);
    expect(newRoomState.packet.payload.payload.status).toBe('lobby');
    expect(newRoomState.packet.payload.payload.activeMatchId).toBeNull();
    expect(newRoomState.packet.payload.payload.confirmedConfig).toBeNull();

    // Send an unknown/malformed minigame event -> handled gracefully without crashing server
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 3, {
      type: 'billiards:unknown_event_type',
      payload: { arbitrary: 123 },
    });

    // Verify server is still alive and responds to sync request
    const syncP = waitForFrame(wsA, (m) => {
      const lm = asLobbyMsg(m);
      return lm.type === 'minigame_event' && lm.packet?.payload?.type === 'billiards:lobby_state';
    });
    sendMinigame(wsA, worldId, MAY_ID, 'sess-a', 4, {
      type: 'billiards:lobby_sync_request',
      payload: {},
    });
    const postSync = await syncP;
    expect(postSync).toBeTruthy();

    wsA.close(1000);
    wsB.close(1000);
  });
});
