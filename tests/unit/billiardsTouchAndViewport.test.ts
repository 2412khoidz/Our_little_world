import { describe, expect, it } from 'vitest';
import { TABLE_H, TABLE_W } from '../../src/shared/billiards/physicsEngine';
import {
  applyLobbyConnectionChange,
  applyLobbyJoin,
  applyLobbyLeave,
  applyLobbyReady,
  createInitialLobbyState,
  promoteCountdownToMatch,
} from '../../src/shared/billiards/lobbyProtocol';
import {
  clientToPhysics2D,
  isPortraitTableViewport,
  physicsToCanvasDims,
  physicsToClient2D,
} from '../../src/features/minigames/billiards/viewportTransform';
import {
  computeAdaptiveAimDelta,
  evaluatePowerPull,
} from '../../src/features/minigames/billiards/touchControls';

describe('Billiards V3 — Portrait Transform, Smart Touch & Online Lobby Reset', () => {
  it('rotates 2D table -90deg cleanly for portrait mobile and preserves coordinates round-trip', () => {
    expect(isPortraitTableViewport(430, 932)).toBe(true);
    expect(isPortraitTableViewport(1280, 800)).toBe(false);

    expect(physicsToCanvasDims(true)).toEqual({ width: TABLE_H, height: TABLE_W });
    expect(physicsToCanvasDims(false)).toEqual({ width: TABLE_W, height: TABLE_H });

    const rect = { left: 40, top: 100, width: 270, height: 500 };
    const samplePts = [
      { x: 250, y: 270 },
      { x: 730, y: 180 },
      { x: 920, y: 490 },
    ];
    for (const pt of samplePts) {
      const client = physicsToClient2D(pt.x, pt.y, rect, 1.0, TABLE_W / 2, TABLE_H / 2, true);
      const back = clientToPhysics2D(client.x, client.y, rect, 1.0, TABLE_W / 2, TABLE_H / 2, true);
      expect(back.x).toBeCloseTo(pt.x, 4);
      expect(back.y).toBeCloseTo(pt.y, 4);
    }

    // Also verifies zoom-space round-trip under portrait orientation
    const zoomClient = physicsToClient2D(680, 310, rect, 1.7, 650, 300, true);
    const zoomBack = clientToPhysics2D(zoomClient.x, zoomClient.y, rect, 1.7, 650, 300, true);
    expect(zoomBack.x).toBeCloseTo(680, 3);
    expect(zoomBack.y).toBeCloseTo(310, 3);
  });

  it('provides micro/fast adaptive touch aim sensitivity and power pull cancel zone', () => {
    const slow = computeAdaptiveAimDelta({
      dx: 1,
      dy: 0,
      cueClientX: 200,
      cueClientY: 500,
      pointerClientX: 200,
      pointerClientY: 360,
      precisionMode: false,
    });
    const fast = computeAdaptiveAimDelta({
      dx: 10,
      dy: 0,
      cueClientX: 200,
      cueClientY: 500,
      pointerClientX: 200,
      pointerClientY: 360,
      precisionMode: false,
    });
    const precision = computeAdaptiveAimDelta({
      dx: 10,
      dy: 0,
      cueClientX: 200,
      cueClientY: 500,
      pointerClientX: 200,
      pointerClientY: 360,
      precisionMode: true,
    });

    expect(Math.abs(fast)).toBeGreaterThan(Math.abs(slow) * 10);
    expect(Math.abs(precision)).toBeLessThan(Math.abs(fast) * 0.4);

    // Valid vertical pull
    const validPull = evaluatePowerPull({
      startX: 24,
      startY: 300,
      curX: 28,
      curY: 420,
      trackHeight: 240,
    });
    expect(validPull.cancelled).toBe(false);
    expect(validPull.power).toBeGreaterThan(0.5);

    // Too small pull -> cancelled
    const shortPull = evaluatePowerPull({
      startX: 24,
      startY: 300,
      curX: 24,
      curY: 304,
      trackHeight: 240,
    });
    expect(shortPull.cancelled).toBe(true);
    expect(shortPull.power).toBe(0);

    // Sideways slide cancel gesture
    const slideCancel = evaluatePowerPull({
      startX: 24,
      startY: 300,
      curX: 95,
      curY: 420,
      trackHeight: 240,
    });
    expect(slideCancel.cancelled).toBe(true);
  });

  it('resets active in_match to fresh lobby on explicit new_lobby while preserving disconnect reconnect', () => {
    let lobby = createInitialLobbyState('world-1', 1000);
    lobby = applyLobbyJoin(lobby, { playerSlot: 0, edition: '3d', rule: '8ball', assetsReady: true }, 1010);
    lobby = applyLobbyJoin(lobby, { playerSlot: 1, assetsReady: true }, 1020);
    const r0 = applyLobbyReady(
      lobby,
      { playerSlot: 0, configVersion: lobby.configVersion, ready: true, assetsReady: true },
      1030,
      { matchId: 'm-3d', matchSeq: 1, rackSeed: 123, scores: [0, 0] },
    );
    expect(r0.accepted).toBe(true);
    lobby = r0.accepted ? r0.nextState : lobby;
    const r1 = applyLobbyReady(
      lobby,
      { playerSlot: 1, configVersion: lobby.configVersion, ready: true, assetsReady: true },
      1040,
      { matchId: 'm-3d', matchSeq: 1, rackSeed: 123, scores: [0, 0] },
    );
    expect(r1.accepted && r1.startedCountdown).toBe(true);
    lobby = r1.accepted ? r1.nextState : lobby;
    lobby = promoteCountdownToMatch(lobby, 3600);
    expect(lobby.status).toBe('in_match');

    // Network disconnect preserves in_match for reconnect
    const afterDisconnect = applyLobbyConnectionChange(lobby, 1, false, 4000);
    expect(afterDisconnect.status).toBe('in_match');

    // Explicit new_lobby reset clears in_match so players can pick 2D or 3D freshly
    const afterNewLobby = applyLobbyLeave(
      afterDisconnect,
      { playerSlot: 0, reason: 'new_lobby' },
      4500,
    );
    expect(afterNewLobby.status).toBe('lobby');
    expect(afterNewLobby.activeMatchId).toBeNull();
    expect(afterNewLobby.confirmedConfig).toBeNull();
  });
});
