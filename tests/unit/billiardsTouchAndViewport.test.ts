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
  MIN_DIRECT_AIM_SCREEN_PX,
  applyPinchZoomSensitivity,
  beginTapGesture,
  cancelTapGesture,
  completeTapGesture,
  computeDirectAimAngle2D,
  computeRelativeFineAimDelta2D,
  evaluatePowerPull,
  markTapMultiTouch,
  normalizeAngleDelta,
  updateTapGesture,
} from '../../src/features/minigames/billiards/touchControls';
import {
  TOUCH_PREFS_STORAGE_KEY,
  createDefaultTouchPreferences,
  loadTouchPreferences,
  normalizeSensitivityMultipliers,
  resetTouchPreferences,
  sanitizeTouchPreferences,
  saveTouchPreferences,
} from '../../src/features/minigames/billiards/touchPreferences';
import {
  computeCameraPose3D,
  shortestAngleDelta3D,
} from '../../src/features/minigames/billiards/cameraController3d';

describe('Billiards V3.2 — Direct Touch Geometry, 3D Camera Math & Online Lobby', () => {
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

    const zoomClient = physicsToClient2D(680, 310, rect, 1.7, 650, 300, true);
    const zoomBack = clientToPhysics2D(zoomClient.x, zoomClient.y, rect, 1.7, 650, 300, true);
    expect(zoomBack.x).toBeCloseTo(680, 3);
    expect(zoomBack.y).toBeCloseTo(310, 3);
  });

  it('direct tap/drag aiming maps accurately across all 4 quadrants in landscape & portrait (1.0x and zoomed)', () => {
    const configs = [
      { portraitRotated: false, rect: { left: 20, top: 60, width: 800, height: 432 }, zoom: 1.0, camX: TABLE_W / 2, camY: TABLE_H / 2 },
      { portraitRotated: true, rect: { left: 60, top: 90, width: 270, height: 500 }, zoom: 1.0, camX: TABLE_W / 2, camY: TABLE_H / 2 },
      { portraitRotated: true, rect: { left: 60, top: 90, width: 270, height: 500 }, zoom: 1.7, camX: 620, camY: 280 },
    ];

    const cueSpots = [
      { x: 260, y: 270 },
      { x: 640, y: 290 },
    ];

    const quadrantTargets = [
      { dx: 140, dy: 90 },
      { dx: -140, dy: 90 },
      { dx: -140, dy: -90 },
      { dx: 140, dy: -90 },
    ];

    for (const cfg of configs) {
      for (const cue of cueSpots) {
        for (const offset of quadrantTargets) {
          const targetPhy = { x: cue.x + offset.dx, y: cue.y + offset.dy };
          const expectedAngle = Math.atan2(offset.dy, offset.dx);
          const client = physicsToClient2D(
            targetPhy.x,
            targetPhy.y,
            cfg.rect,
            cfg.zoom,
            cfg.camX,
            cfg.camY,
            cfg.portraitRotated,
          );
          const computed = computeDirectAimAngle2D({
            clientX: client.x,
            clientY: client.y,
            rect: cfg.rect,
            cueX: cue.x,
            cueY: cue.y,
            zoomCurrent: cfg.zoom,
            camX: cfg.camX,
            camY: cfg.camY,
            portraitRotated: cfg.portraitRotated,
          });
          expect(computed).not.toBeNull();
          expect(Math.abs(normalizeAngleDelta(expectedAngle, computed!))).toBeLessThan(1e-4);
        }
      }
    }
  });

  it('maintains consistent screen-clockwise / CCW rotation across portrait, landscape, zoomed & all 4 quadrants and suppresses near-cue jitter', () => {
    const scenarios = [
      { portraitRotated: false, rect: { left: 0, top: 0, width: 1000, height: 540 }, zoom: 1.0 },
      { portraitRotated: true, rect: { left: 0, top: 0, width: 540, height: 1000 }, zoom: 1.0 },
      { portraitRotated: true, rect: { left: 0, top: 0, width: 540, height: 1000 }, zoom: 1.8 },
    ];
    const cue = { x: 480, y: 260 };

    for (const sc of scenarios) {
      const cueClient = physicsToClient2D(
        cue.x,
        cue.y,
        sc.rect,
        sc.zoom,
        cue.x,
        cue.y,
        sc.portraitRotated,
      );

      // Inside MIN_DIRECT_AIM_SCREEN_PX deadzone -> returns null
      expect(
        computeDirectAimAngle2D({
          clientX: cueClient.x + MIN_DIRECT_AIM_SCREEN_PX * 0.4,
          clientY: cueClient.y + 2,
          rect: sc.rect,
          cueX: cue.x,
          cueY: cue.y,
          zoomCurrent: sc.zoom,
          camX: cue.x,
          camY: cue.y,
          portraitRotated: sc.portraitRotated,
        }),
      ).toBeNull();

      // Walking clockwise around cue center in SCREEN coordinates at radius 110px
      const screenAngles = [0.2, 0.35, 1.4, 1.55, 2.8, 2.95, 4.3, 4.45];
      for (let i = 0; i < screenAngles.length; i += 2) {
        const a0 = screenAngles[i]!;
        const a1 = screenAngles[i + 1]!;
        const p0 = computeDirectAimAngle2D({
          clientX: cueClient.x + Math.cos(a0) * 110,
          clientY: cueClient.y + Math.sin(a0) * 110,
          rect: sc.rect,
          cueX: cue.x,
          cueY: cue.y,
          zoomCurrent: sc.zoom,
          camX: cue.x,
          camY: cue.y,
          portraitRotated: sc.portraitRotated,
        })!;
        const p1 = computeDirectAimAngle2D({
          clientX: cueClient.x + Math.cos(a1) * 110,
          clientY: cueClient.y + Math.sin(a1) * 110,
          rect: sc.rect,
          cueX: cue.x,
          cueY: cue.y,
          zoomCurrent: sc.zoom,
          camX: cue.x,
          camY: cue.y,
          portraitRotated: sc.portraitRotated,
        })!;

        // Increasing screen angle (CW in screen Y-down coordinates) MUST advance physics aimAngle CW too
        // because -90deg rotation is rigid orientation-preserving (det = +1).
        const step = normalizeAngleDelta(p0, p1);
        expect(step).toBeGreaterThan(0);

        // Sampling-rate invariance: 3 sub-steps sum identically to 1 coarse step
        const midAngle = (a0 + a1) * 0.5;
        const pMid = computeDirectAimAngle2D({
          clientX: cueClient.x + Math.cos(midAngle) * 110,
          clientY: cueClient.y + Math.sin(midAngle) * 110,
          rect: sc.rect,
          cueX: cue.x,
          cueY: cue.y,
          zoomCurrent: sc.zoom,
          camX: cue.x,
          camY: cue.y,
          portraitRotated: sc.portraitRotated,
        })!;
        const fineSum =
          computeRelativeFineAimDelta2D({ prevPhysicsAngle: p0, curPhysicsAngle: pMid, scale: 0.28 }) +
          computeRelativeFineAimDelta2D({ prevPhysicsAngle: pMid, curPhysicsAngle: p1, scale: 0.28 });
        const coarseStep = computeRelativeFineAimDelta2D({
          prevPhysicsAngle: p0,
          curPhysicsAngle: p1,
          scale: 0.28,
        });
        expect(fineSum).toBeCloseTo(coarseStep, 6);
      }
    }
  });

  it('evaluates touch power pull & horizontal cancel gesture cleanly', () => {
    const validPull = evaluatePowerPull({
      startX: 24,
      startY: 300,
      curX: 28,
      curY: 420,
      trackHeight: 240,
    });
    expect(validPull.cancelled).toBe(false);
    expect(validPull.power).toBeGreaterThan(0.5);

    const shortPull = evaluatePowerPull({
      startX: 24,
      startY: 300,
      curX: 24,
      curY: 304,
      trackHeight: 240,
    });
    expect(shortPull.cancelled).toBe(true);
    expect(shortPull.power).toBe(0);

    const slideCancel = evaluatePowerPull({
      startX: 24,
      startY: 300,
      curX: 95,
      curY: 420,
      trackHeight: 240,
    });
    expect(slideCancel.cancelled).toBe(true);
  });

  it('computes shortest-angle 3D wrap and aspect-aware top/follow camera poses without jumps', () => {
    const diffAcrossPi = shortestAngleDelta3D(Math.PI - 0.1, -Math.PI + 0.1);
    expect(diffAcrossPi).toBeCloseTo(0.2, 6);

    const topPortrait = computeCameraPose3D({
      mode: 'top',
      aspect: 430 / 820,
      zoomLevel: 1.0,
      visualAimAngle: 0,
      cueX: -0.5,
      cueZ: 0,
      cuePocketed: false,
      phase: 'aim',
      isStriking: false,
      draggingCueBall: false,
      hoverZoomActive: false,
      hoverWorldPt: null,
    });
    expect(topPortrait.up).toEqual([1, 0, 0]);
    expect(topPortrait.fov).toBe(54);
    expect(topPortrait.position[1]).toBeGreaterThan(3.0);

    const followPortrait = computeCameraPose3D({
      mode: 'follow',
      aspect: 430 / 820,
      zoomLevel: 1.0,
      visualAimAngle: 0,
      cueX: -0.5,
      cueZ: 0,
      cuePocketed: false,
      phase: 'aim',
      isStriking: false,
      draggingCueBall: false,
      hoverZoomActive: false,
      hoverWorldPt: null,
    });
    expect(followPortrait.position[0]).toBeLessThan(-0.5);
    expect(followPortrait.lookAt[0]).toBeCloseTo(-0.05, 5);
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

    const afterDisconnect = applyLobbyConnectionChange(lobby, 1, false, 4000);
    expect(afterDisconnect.status).toBe('in_match');

    const afterNewLobby = applyLobbyLeave(
      afterDisconnect,
      { playerSlot: 0, reason: 'new_lobby' },
      4500,
    );
    expect(afterNewLobby.status).toBe('lobby');
    expect(afterNewLobby.activeMatchId).toBeNull();
    expect(afterNewLobby.confirmedConfig).toBeNull();
  });

  it('P0-A: normalizes, clamps, persists & resets touch sensitivity preferences', () => {
    const def = createDefaultTouchPreferences();
    expect(def.aimSensitivityPct).toBe(65);
    expect(def.lockedFineSensitivityPct).toBe(30);
    expect(def.cameraRotationSensitivityPct).toBe(75);
    expect(def.pinchZoomSensitivityPct).toBe(80);

    const clamped = sanitizeTouchPreferences({
      aimSensitivityPct: 999,
      lockedFineSensitivityPct: 1,
      cameraRotationSensitivityPct: -10,
      pinchZoomSensitivityPct: 250,
    });
    expect(clamped.aimSensitivityPct).toBe(200);
    expect(clamped.lockedFineSensitivityPct).toBe(5);
    expect(clamped.cameraRotationSensitivityPct).toBe(10);
    expect(clamped.pinchZoomSensitivityPct).toBe(200);

    const baselineMuls = normalizeSensitivityMultipliers(
      sanitizeTouchPreferences({
        aimSensitivityPct: 100,
        lockedFineSensitivityPct: 100,
        cameraRotationSensitivityPct: 100,
        pinchZoomSensitivityPct: 100,
      }),
    );
    expect(baselineMuls).toEqual({
      aimMul: 1,
      lockedFineMul: 1,
      cameraRotateMul: 1,
      pinchZoomMul: 1,
    });

    // Pinch sensitivity 1.0 matches baseline ratio; <1.0 dampens, >1.0 amplifies
    expect(applyPinchZoomSensitivity(1.2, 1.25, 1.0, 0.7, 2.6)).toBeCloseTo(1.5, 5);
    expect(applyPinchZoomSensitivity(1.2, 1.25, 0.5, 0.7, 2.6)).toBeLessThan(1.5);
    expect(applyPinchZoomSensitivity(1.2, 1.25, 1.8, 0.7, 2.6)).toBeGreaterThan(1.5);

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(TOUCH_PREFS_STORAGE_KEY);
      saveTouchPreferences({
        ...def,
        aimSensitivityPct: 120,
        lockedFineSensitivityPct: 15,
      });
      expect(loadTouchPreferences().aimSensitivityPct).toBe(120);
      expect(loadTouchPreferences().lockedFineSensitivityPct).toBe(15);
      resetTouchPreferences();
      expect(loadTouchPreferences().aimSensitivityPct).toBe(65);
      expect(loadTouchPreferences().lockedFineSensitivityPct).toBe(30);
    }
  });

  it('P0-B: classifies taps strictly on completed single-touch gestures without drag, pinch, cancel or UI bleed', () => {
    // Valid genuine tap
    let g = beginTapGesture({
      pointerId: 1,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200,
      timeMs: 1000,
    });
    updateTapGesture(g, 1, 104, 203);
    expect(
      completeTapGesture(g, { pointerId: 1, clientX: 103, clientY: 202, timeMs: 1180 }),
    ).toBe(true);

    // Dragged > 8 CSS px then returned near start -> MUST be rejected as tap!
    g = beginTapGesture({
      pointerId: 2,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200,
      timeMs: 1000,
    });
    updateTapGesture(g, 2, 125, 200);
    updateTapGesture(g, 2, 101, 200);
    expect(
      completeTapGesture(g, { pointerId: 2, clientX: 100, clientY: 200, timeMs: 1150 }),
    ).toBe(false);

    // Held too long (> 450ms) -> rejected
    g = beginTapGesture({
      pointerId: 3,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200,
      timeMs: 1000,
    });
    expect(
      completeTapGesture(g, { pointerId: 3, clientX: 101, clientY: 201, timeMs: 1600 }),
    ).toBe(false);

    // Escalated to multitouch pinch -> rejected
    g = beginTapGesture({
      pointerId: 4,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200,
      timeMs: 1000,
    });
    markTapMultiTouch(g);
    expect(
      completeTapGesture(g, { pointerId: 4, clientX: 100, clientY: 200, timeMs: 1100 }),
    ).toBe(false);

    // Cancelled / ball-in-hand / UI blocked -> rejected
    g = beginTapGesture({
      pointerId: 5,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200,
      timeMs: 1000,
    });
    cancelTapGesture(g);
    expect(
      completeTapGesture(g, { pointerId: 5, clientX: 100, clientY: 200, timeMs: 1100 }),
    ).toBe(false);

    const gUi = beginTapGesture({
      pointerId: 6,
      pointerType: 'touch',
      clientX: 100,
      clientY: 200,
      timeMs: 1000,
      blockedByUi: true,
    });
    expect(
      completeTapGesture(gUi, { pointerId: 6, clientX: 100, clientY: 200, timeMs: 1100 }),
    ).toBe(false);
  });

  it('P0-B: focuses 3D follow/top camera on tapped ball without altering visualAimAngle', () => {
    const focusedPose = computeCameraPose3D({
      mode: 'follow',
      aspect: 430 / 820,
      zoomLevel: 1.0,
      visualAimAngle: 0.25,
      cueX: -0.6,
      cueZ: 0.1,
      cuePocketed: false,
      phase: 'aim',
      isStriking: false,
      draggingCueBall: false,
      hoverZoomActive: false,
      hoverWorldPt: null,
      focusedBallId: 9,
      focusedBallPos: { x: 0.85, z: -0.35 },
    });
    expect(focusedPose.lookAt[0]).toBeCloseTo(0.85, 4);
    expect(focusedPose.lookAt[2]).toBeCloseTo(-0.35, 4);
    expect(focusedPose.position[1]).toBeGreaterThan(0.5);
  });
});
