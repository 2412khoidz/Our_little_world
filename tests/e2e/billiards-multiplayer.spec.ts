import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  BALL_R,
  MAX_SPEED,
  MIN_SPEED_SHOT,
  PLAY_B,
  PLAY_L,
  PLAY_R,
  PLAY_T,
  POCKETS,
  TABLE_H,
  TABLE_W,
  cloneBalls,
  createInitialRack,
  evaluateShotRules,
  findOpenCueSpot,
  isPositionValidForCue,
  stepBilliardsFixedTick,
} from '../../src/shared/billiards/physicsEngine';
import { compareMatchOrder } from '../../src/shared/billiards/protocol';
import type {
  BallState,
  BilliardsEdition,
  BilliardsLobbyState,
  BilliardsRule,
  MatchSnapshot,
  MatchStartPayload,
  PlayerSlot,
  SettledStatePayload,
} from '../../src/shared/billiards/types';

interface WireState {
  worldId: string | null;
  partnerAUserId: string;
  startsByMatchId: Map<string, MatchStartPayload>;
  settledByKey: Map<string, SettledStatePayload>;
  settledHistory: SettledStatePayload[];
  snapshotsByKey: Map<string, MatchSnapshot>;
  latestStart: MatchStartPayload | null;
  stateRequestCount: number;
}

function createWireState(): WireState {
  return {
    worldId: null,
    partnerAUserId: '11111111-1111-4111-8111-111111111111',
    startsByMatchId: new Map(),
    settledByKey: new Map(),
    settledHistory: [],
    snapshotsByKey: new Map(),
    latestStart: null,
    stateRequestCount: 0,
  };
}

function recordBilliardsWireEvent(
  state: WireState,
  worldId: string | undefined,
  evt: { type?: string; payload?: unknown },
): void {
  if (worldId && !state.worldId) {
    state.worldId = worldId;
  }
  if (evt.type === 'billiards:start') {
    const start = evt.payload as MatchStartPayload;
    state.startsByMatchId.set(start.matchId, start);
    if (
      !state.latestStart ||
      compareMatchOrder(
        {
          matchSeq: start.matchSeq,
          initiatorSlot: start.initiatorSlot,
          matchId: start.matchId,
        },
        {
          matchSeq: state.latestStart.matchSeq,
          initiatorSlot: state.latestStart.initiatorSlot,
          matchId: state.latestStart.matchId,
        },
      ) > 0
    ) {
      state.latestStart = start;
    }
  } else if (evt.type === 'billiards:lobby_state') {
    const lobby = evt.payload as BilliardsLobbyState;
    if (lobby.confirmedConfig && !state.startsByMatchId.has(lobby.confirmedConfig.matchId)) {
      const start: MatchStartPayload = {
        matchId: lobby.confirmedConfig.matchId,
        matchSeq: lobby.confirmedConfig.matchSeq,
        initiatorSlot: lobby.confirmedConfig.startingPlayer,
        edition: lobby.confirmedConfig.edition,
        rule: lobby.confirmedConfig.rule,
        startingPlayer: lobby.confirmedConfig.startingPlayer,
        rackSeed: lobby.confirmedConfig.rackSeed,
        scores: lobby.confirmedConfig.scores,
        createdAtMs: lobby.confirmedConfig.startAtServerMs,
        turnDeadlineMs: lobby.confirmedConfig.startAtServerMs + 30_000,
        turnRemainingMs: 30_000,
        startAtServerMs: lobby.confirmedConfig.startAtServerMs,
      };
      recordBilliardsWireEvent(state, worldId, { type: 'billiards:start', payload: start });
    }
  } else if (evt.type === 'billiards:settled') {
    const settled = evt.payload as SettledStatePayload;
    state.settledByKey.set(`${settled.matchId}:${settled.stateVersion}`, settled);
    state.settledHistory.push(settled);
  } else if (evt.type === 'billiards:state_snapshot') {
    const snap = evt.payload as MatchSnapshot;
    state.snapshotsByKey.set(`${snap.matchId}:${snap.stateVersion}`, snap);
  } else if (evt.type === 'billiards:state_request') {
    state.stateRequestCount += 1;
  }
}

function attachWireTracker(page: Page, state: WireState): void {
  page.on('websocket', (ws) => {
    if (!ws.url().includes('/api/dev-lan/ws')) return;
    const handleFrame = ({ payload }: { payload: string | Buffer }) => {
      if (typeof payload !== 'string') return;
      try {
        const frame = JSON.parse(payload) as {
          type?: string;
          packet?: {
            gameId?: string;
            worldId?: string;
            payload?: { type?: string; payload?: unknown };
          };
        };
        if (
          frame.type === 'minigame_event' &&
          frame.packet?.gameId === 'billiards' &&
          frame.packet.payload
        ) {
          recordBilliardsWireEvent(state, frame.packet.worldId, frame.packet.payload);
        }
      } catch {
        // Ignore malformed WS frames
      }
    };
    ws.on('framesent', handleFrame);
    ws.on('framereceived', handleFrame);
  });

  page.on('request', (req) => {
    if (!req.url().includes('/api/dev-lan/realtime') || req.method() !== 'POST') return;
    try {
      const body = req.postDataJSON() as {
        worldId?: string;
        kind?: string;
        payload?: {
          gameId?: string;
          worldId?: string;
          payload?: { type?: string; payload?: unknown };
        };
      } | null;
      if (!body) return;
      if (body.worldId && !state.worldId) {
        state.worldId = body.worldId;
      }
      if (
        body.kind !== 'minigame_event' ||
        body.payload?.gameId !== 'billiards' ||
        !body.payload.payload
      ) {
        return;
      }
      recordBilliardsWireEvent(state, body.worldId ?? body.payload.worldId, body.payload.payload);
    } catch {
      // Ignore malformed/non-JSON payloads
    }
  });
}

async function joinWorldPreset(
  page: Page,
  presetTestId: 'preset-partner-a' | 'preset-partner-b',
  opts?: { afterReload?: boolean },
) {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  if (!opts?.afterReload) {
    const seedBtn = page.getByTestId('btn-dev-seed-couple');
    await expect(seedBtn).toBeVisible({ timeout: 10_000 });
    await seedBtn.click();
    const preset = page.getByTestId(presetTestId);
    await expect(preset).toBeVisible({ timeout: 10_000 });
    await preset.click();
  }
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-render-suspended', '0', { timeout: 15_000 });
  return canvas;
}

async function openBilliardsModal(page: Page): Promise<Locator> {
  await page.getByTestId('nav-menu').click();
  await expect(page.getByTestId('menu-billiards')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('menu-billiards').click();
  const modal = page.getByTestId('billiards-modal');
  await expect(modal).toBeVisible({ timeout: 10_000 });
  return modal;
}

async function enterOnlineLobby(page: Page): Promise<Locator> {
  const modal = await openBilliardsModal(page);
  await expect(page.getByTestId('billiards-entry-menu')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('billiards-mode-online').click();
  await page.getByTestId('billiards-start-btn').click();
  await expect(page.getByTestId('billiards-online-lobby')).toBeVisible({ timeout: 10_000 });
  return modal;
}

async function resumeOnlineMatch(page: Page, edition: BilliardsEdition = '2d'): Promise<Locator> {
  await openBilliardsModal(page);
  const resumeBtn = page.getByTestId('billiards-resume-online-btn');
  await expect(resumeBtn).toBeVisible({ timeout: 10_000 });
  await resumeBtn.click();
  const game = page.getByTestId(edition === '3d' ? 'billiards-3d-game' : 'billiards-2d-game');
  await expect(game).toBeVisible({ timeout: 15_000 });
  return game;
}

async function startOnlineMatchViaLobby(
  pageA: Page,
  pageB: Page,
  opts?: { edition?: BilliardsEdition; rule?: BilliardsRule; startingPlayer?: PlayerSlot },
): Promise<{ modalA: Locator; modalB: Locator }> {
  const edition = opts?.edition ?? '2d';
  const rule = opts?.rule ?? '9ball';
  const startingPlayer = opts?.startingPlayer ?? 0;

  await Promise.all([enterOnlineLobby(pageA), enterOnlineLobby(pageB)]);

  await expect(pageA.getByTestId('lobby-player-0')).toHaveAttribute('data-assets-ready', '1', { timeout: 15_000 });
  await expect(pageA.getByTestId('lobby-player-1')).toHaveAttribute('data-assets-ready', '1', { timeout: 15_000 });

  await pageA.getByTestId(`lobby-edition-${edition}`).click();
  await pageA.getByTestId(`lobby-rule-${rule}`).click();
  await pageA.getByTestId(`lobby-starter-${startingPlayer}`).click();

  await expect(pageA.getByTestId('lobby-player-0')).toHaveAttribute('data-assets-ready', '1', { timeout: 15_000 });
  await expect(pageA.getByTestId('lobby-player-1')).toHaveAttribute('data-assets-ready', '1', { timeout: 15_000 });
  await expect(pageB.getByTestId('lobby-player-0')).toHaveAttribute('data-assets-ready', '1', { timeout: 15_000 });
  await expect(pageB.getByTestId('lobby-player-1')).toHaveAttribute('data-assets-ready', '1', { timeout: 15_000 });

  await Promise.all([
    pageA.getByTestId('billiards-lobby-ready-btn').click(),
    pageB.getByTestId('billiards-lobby-ready-btn').click(),
  ]);

  await expect(pageA.getByTestId('billiards-countdown')).toBeVisible({ timeout: 5_000 });
  await expect(pageB.getByTestId('billiards-countdown')).toBeVisible({ timeout: 5_000 });

  const gameTestId = edition === '3d' ? 'billiards-3d-game' : 'billiards-2d-game';
  const gameA = pageA.getByTestId(gameTestId);
  const gameB = pageB.getByTestId(gameTestId);
  await expect(gameA).toBeVisible({ timeout: 15_000 });
  await expect(gameB).toBeVisible({ timeout: 15_000 });
  await waitForMatchConvergence(gameA, gameB, { expectedRule: rule });
  return { modalA: gameA, modalB: gameB };
}

async function waitForMatchConvergence(
  modalA: Locator,
  modalB: Locator,
  opts?: { expectedRule?: BilliardsRule; minMatchSeq?: number },
) {
  await expect
    .poll(
      async () => {
        const idA = await modalA.getAttribute('data-match-id');
        const idB = await modalB.getAttribute('data-match-id');
        const seqA = Number(await modalA.getAttribute('data-match-seq') ?? '0');
        const seqB = Number(await modalB.getAttribute('data-match-seq') ?? '0');
        const ruleA = await modalA.getAttribute('data-rule');
        const ruleB = await modalB.getAttribute('data-rule');
        if (!idA || idA !== idB || seqA < 1 || seqA !== seqB || ruleA !== ruleB) {
          return false;
        }
        if (opts?.expectedRule && ruleA !== opts.expectedRule) return false;
        if (opts?.minMatchSeq && seqA < opts.minMatchSeq) return false;
        return true;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

function rayMaxToCanvasBox(
  cx: number,
  cy: number,
  angle: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let tMax = 180;
  if (dx > 1e-6) tMax = Math.min(tMax, (maxX - cx) / dx);
  else if (dx < -1e-6) tMax = Math.min(tMax, (minX - cx) / dx);
  if (dy > 1e-6) tMax = Math.min(tMax, (maxY - cy) / dy);
  else if (dy < -1e-6) tMax = Math.min(tMax, (minY - cy) / dy);
  return Math.max(48, Math.min(180, tMax * 0.92));
}

async function performUiShot(
  page: Page,
  balls: BallState[],
  angle: number,
  power: number,
  cueTarget?: { x: number; y: number },
): Promise<void> {
  const canvas = page.getByTestId('billiards-canvas');
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Missing billiards-canvas bounding box');

  const toClient = (tx: number, ty: number) => ({
    x: canvasBox.x + (tx / TABLE_W) * canvasBox.width,
    y: canvasBox.y + (ty / TABLE_H) * canvasBox.height,
  });

  const origCue = balls.find((b) => b.id === 0);
  if (!origCue) throw new Error('Missing cue ball in live state');
  let cueX = origCue.x;
  let cueY = origCue.y;

  if (cueTarget) {
    const fromPt = toClient(cueX, cueY);
    const toPt = toClient(cueTarget.x, cueTarget.y);
    await page.mouse.move(fromPt.x, fromPt.y);
    await page.mouse.down();
    await page.mouse.move(toPt.x, toPt.y, { steps: 6 });
    await page.mouse.up();
    cueX = cueTarget.x;
    cueY = cueTarget.y;
  }

  // Click aim target far enough (> BALL_R * 3.4) from cue ball so aimAngle updates without dragging cue ball
  const aimDist = rayMaxToCanvasBox(cueX, cueY, angle, 6, TABLE_W - 6, 6, TABLE_H - 6);
  const aimClient = toClient(cueX + Math.cos(angle) * aimDist, cueY + Math.sin(angle) * aimDist);
  await page.mouse.move(aimClient.x, aimClient.y);
  await page.mouse.down();
  await page.mouse.up();

  // Drag power slot downwards by exact 0.72 * clientHeight * power
  const slot = page.getByTestId('billiards-power-slot');
  const slotMeta = await slot.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top,
      height: r.height,
      clientHeight: el.clientHeight,
    };
  });
  const startY = slotMeta.y + Math.min(18, slotMeta.height * 0.1);
  const pullPx = slotMeta.clientHeight * 0.72 * power;
  await page.mouse.move(slotMeta.x, startY);
  await page.mouse.down();
  await page.mouse.move(slotMeta.x, startY + pullPx, { steps: 6 });
  await page.mouse.up();
}

function pickNineBallShot(
  balls: BallState[],
  currentPlayer: PlayerSlot,
  canMoveCueBall: boolean,
  isBreak: boolean,
): { cueTarget?: { x: number; y: number }; angle: number; power: number } {
  if (isBreak) {
    return { angle: (0.5 * Math.PI) / 180, power: 0.9 };
  }

  const rem = balls.filter((b) => b.id !== 0 && !b.pocketed).sort((a, b) => a.id - b.id);
  const low = rem[0];
  const cue = balls.find((b) => b.id === 0);
  if (!low || !cue) {
    return { angle: 0, power: 0.55 };
  }
  const nine = balls.find((b) => b.id === 9 && !b.pocketed);

  const cueSpots: Array<{ x: number; y: number } | undefined> = [undefined];
  if (canMoveCueBall) {
    for (const p of POCKETS) {
      const dx = p.x - low.x;
      const dy = p.y - low.y;
      const dist = Math.hypot(dx, dy) || 1;
      for (const mul of [2.5, 4.0]) {
        const cx = Math.max(PLAY_L + BALL_R + 4, Math.min(PLAY_R - BALL_R - 4, low.x - (dx / dist) * (BALL_R * mul)));
        const cy = Math.max(PLAY_T + BALL_R + 4, Math.min(PLAY_B - BALL_R - 4, low.y - (dy / dist) * (BALL_R * mul)));
        if (isPositionValidForCue(balls, cx, cy)) {
          cueSpots.push({ x: cx, y: cy });
        }
      }
    }
  }

  let best: { cueTarget?: { x: number; y: number }; angle: number; power: number; score: number } | null = null;
  const tryCand = (cp: { x: number; y: number } | undefined, angle: number, power: number) => {
    const sim = cloneBalls(balls);
    const simCue = sim.find((b) => b.id === 0)!;
    if (cp) {
      simCue.x = cp.x;
      simCue.y = cp.y;
    }
    const spd = MIN_SPEED_SHOT + Math.pow(power, 1.32) * (MAX_SPEED - MIN_SPEED_SHOT);
    simCue.vx = Math.cos(angle) * spd;
    simCue.vy = Math.sin(angle) * spd;
    simCue.rollVx = simCue.vx * 0.14;
    simCue.rollVy = simCue.vy * 0.14;
    let firstHit: number | null = null;
    const pocketed: number[] = [];
    let guard = 0;
    while (
      guard < 15_000 &&
      stepBilliardsFixedTick(sim, {
        onFirstHit: (id) => {
          if (firstHit === null) firstHit = id;
        },
        onPocket: (b) => pocketed.push(b.id),
        onBallHit: () => {},
        onCushion: () => {},
      })
    ) {
      guard++;
    }
    const out = evaluateShotRules({
      rule: '9ball',
      balls: sim,
      currentPlayer,
      groups: [null, null],
      isBreakShot: false,
      wasOnEightBeforeShot: false,
      firstHit,
      pocketed: pocketed.filter((id) => id !== 0),
      scratched: pocketed.includes(0),
      playerNames: ['A', 'B'],
    });
    if (out.winner && out.winner.slot === currentPlayer) {
      best = { cueTarget: cp, angle, power, score: 10_000 };
      return true;
    }
    if (firstHit === low.id && !pocketed.includes(0)) {
      const sc = pocketed.length * 10 + (out.nextPlayer === currentPlayer ? 5 : 0);
      if (!best || sc > best.score) {
        best = { cueTarget: cp, angle, power, score: sc };
      }
    }
    return false;
  };

  for (const cp of cueSpots) {
    const refCue = cp ?? cue;
    for (const p of POCKETS) {
      const dx = p.x - low.x;
      const dy = p.y - low.y;
      const dist = Math.hypot(dx, dy) || 1;
      const gx = low.x - (dx / dist) * (BALL_R * 2);
      const gy = low.y - (dy / dist) * (BALL_R * 2);
      const base = Math.atan2(gy - refCue.y, gx - refCue.x);
      for (const da of [0, -0.008, 0.008, -0.016, 0.016]) {
        if (tryCand(cp, base + da, 0.68)) return best!;
      }
    }
    if (nine && nine.id !== low.id) {
      const dx = nine.x - low.x;
      const dy = nine.y - low.y;
      const dist = Math.hypot(dx, dy) || 1;
      const gx = low.x - (dx / dist) * (BALL_R * 2);
      const gy = low.y - (dy / dist) * (BALL_R * 2);
      const base9 = Math.atan2(gy - refCue.y, gx - refCue.x);
      for (const da of [0, -0.012, 0.012, -0.025, 0.025]) {
        if (tryCand(cp, base9 + da, 0.78)) return best!;
      }
    }
  }

  return (
    best ?? {
      cueTarget: canMoveCueBall ? findOpenCueSpot(balls) : undefined,
      angle: Math.atan2(low.y - cue.y, low.x - cue.x),
      power: 0.65,
    }
  );
}

async function resolveCurrentBallsForModal(
  modal: Locator,
  wire: WireState,
): Promise<{ balls: BallState[]; canMoveCueBall: boolean; isBreak: boolean }> {
  const matchId = (await modal.getAttribute('data-match-id')) ?? '';
  const stateVersion = Number(await modal.getAttribute('data-state-version') ?? '0');

  if (stateVersion === 0) {
    await expect
      .poll(() => wire.startsByMatchId.has(matchId), { timeout: 10_000 })
      .toBe(true);
    const start = wire.startsByMatchId.get(matchId)!;
    return {
      balls: createInitialRack(start.rule, start.rackSeed),
      canMoveCueBall: false,
      isBreak: true,
    };
  }

  await expect
    .poll(
      () =>
        wire.settledByKey.has(`${matchId}:${stateVersion}`) ||
        wire.snapshotsByKey.has(`${matchId}:${stateVersion}`),
      { timeout: 10_000 },
    )
    .toBe(true);

  const settled = wire.settledByKey.get(`${matchId}:${stateVersion}`);
  if (settled) {
    return {
      balls: cloneBalls(settled.balls),
      canMoveCueBall: settled.ballInHand,
      isBreak: settled.isBreakShot,
    };
  }
  const snap = wire.snapshotsByKey.get(`${matchId}:${stateVersion}`)!;
  return {
    balls: cloneBalls(snap.balls),
    canMoveCueBall: snap.ballInHand,
    isBreak: snap.isBreakShot,
  };
}

test.describe('Billiards V2 multiplayer integration — two independent clients', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/dev-lan/reset', { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('coordinates lobby ready check & synchronized start, plays full 9-ball match to completion, persists idempotently, and supports mutual rematch', async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    const wire = createWireState();

    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    attachWireTracker(pageA, wire);
    attachWireTracker(pageB, wire);

    const errors: string[] = [];
    pageA.on('pageerror', (err) => errors.push(`pageA:${err.message}`));
    pageB.on('pageerror', (err) => errors.push(`pageB:${err.message}`));

    await pageA.goto('/');
    await pageB.goto('/');
    await joinWorldPreset(pageA, 'preset-partner-a');
    await joinWorldPreset(pageB, 'preset-partner-b');

    const { modalA, modalB } = await startOnlineMatchViaLobby(pageA, pageB, {
      edition: '2d',
      rule: '9ball',
      startingPlayer: 0,
    });

    // Play full genuine 9-ball match to completion using UI pointer aim & power drag
    let shotsTaken = 0;
    while (shotsTaken < 25) {
      const phaseA = await modalA.getAttribute('data-phase');
      if (phaseA === 'gameOver') break;

      await expect(modalA).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });
      await expect(modalB).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });
      await expect
        .poll(
          async () => {
            const svA = await modalA.getAttribute('data-state-version');
            const svB = await modalB.getAttribute('data-state-version');
            const cpA = await modalA.getAttribute('data-current-player');
            const cpB = await modalB.getAttribute('data-current-player');
            return svA === svB && cpA === cpB;
          },
          { timeout: 15_000 },
        )
        .toBe(true);

      const curPlayer = Number(await modalA.getAttribute('data-current-player') ?? '0') as PlayerSlot;
      const shooterPage = curPlayer === 0 ? pageA : pageB;
      const shooterModal = curPlayer === 0 ? modalA : modalB;
      const { balls, canMoveCueBall, isBreak } = await resolveCurrentBallsForModal(shooterModal, wire);
      const nextShot = pickNineBallShot(balls, curPlayer, canMoveCueBall, isBreak);

      shotsTaken++;
      const prevShotSeq = Number(await modalA.getAttribute('data-shot-seq') ?? '0');
      await performUiShot(shooterPage, balls, nextShot.angle, nextShot.power, nextShot.cueTarget);

      await expect
        .poll(
          async () => {
            const seqA = Number(await modalA.getAttribute('data-shot-seq') ?? '0');
            const seqB = Number(await modalB.getAttribute('data-shot-seq') ?? '0');
            const pA = await modalA.getAttribute('data-phase');
            const pB = await modalB.getAttribute('data-phase');
            return (
              seqA > prevShotSeq &&
              seqA === seqB &&
              (pA === 'aim' || pA === 'gameOver') &&
              pA === pB
            );
          },
          { timeout: 20_000 },
        )
        .toBe(true);

      if ((await modalA.getAttribute('data-phase')) === 'gameOver') {
        break;
      }
    }

    await expect(modalA).toHaveAttribute('data-phase', 'gameOver');
    await expect(modalB).toHaveAttribute('data-phase', 'gameOver');
    await expect(pageA.getByTestId('billiards-winner-card')).toBeVisible();
    await expect(pageB.getByTestId('billiards-winner-card')).toBeVisible();

    const scoreA = (await pageA.getByTestId('billiards-score').textContent()) ?? '';
    const scoreB = (await pageB.getByTestId('billiards-score').textContent()) ?? '';
    expect(scoreA).toBe(scoreB);
    expect(scoreA.includes('1 - 0') || scoreA.includes('0 - 1')).toBe(true);
    expect(await modalA.getAttribute('data-shot-seq')).toBe(await modalB.getAttribute('data-shot-seq'));
    expect(await modalA.getAttribute('data-shot-count')).toBe(await modalB.getAttribute('data-shot-count'));

    // Idempotent DB persistence check on dev-lan backend
    expect(wire.worldId).toBeTruthy();
    await expect
      .poll(
        async () => {
          const statsRes = await request.get(
            `/api/dev-lan/billiards/stats?worldId=${encodeURIComponent(wire.worldId!)}`,
            { headers: { 'x-dev-user-id': wire.partnerAUserId } },
          );
          if (!statsRes.ok()) return -1;
          const statsJson = (await statsRes.json()) as {
            ok: boolean;
            data?: { totalMatches: number };
          };
          return statsJson.data?.totalMatches ?? -1;
        },
        { timeout: 10_000 },
      )
      .toBe(1);

    // Mutual Rematch triggered by both partner & owner -> preserves score & increments matchSeq
    const endMatchSeq = Number(await modalA.getAttribute('data-match-seq') ?? '0');
    await Promise.all([
      pageB.getByTestId('billiards-next-match').click(),
      pageA.getByTestId('billiards-next-match').click(),
    ]);
    await waitForMatchConvergence(modalA, modalB, {
      expectedRule: '9ball',
      minMatchSeq: endMatchSeq + 1,
    });
    await expect(modalA).toHaveAttribute('data-phase', 'aim', { timeout: 10_000 });
    await expect(modalB).toHaveAttribute('data-phase', 'aim', { timeout: 10_000 });
    expect(await pageA.getByTestId('billiards-score').textContent()).toBe(scoreA);

    expect(errors).toEqual([]);
    await ctxA.close();
    await ctxB.close();
  });

  test('recovers between shots and mid-shot after reconnect, rejects delayed stale packets, and resyncs on visibility/resume', async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    const wire = createWireState();

    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctxB.addInitScript(() => {
      const OrigES = window.EventSource;
      const tracked: EventSource[] = [];
      (window as unknown as { __olwEsList?: EventSource[] }).__olwEsList = tracked;
      const WrappedES = function (
        this: EventSource,
        url: string | URL,
        init?: EventSourceInit,
      ) {
        const es = new OrigES(url, init);
        tracked.push(es);
        return es;
      } as unknown as typeof EventSource;
      WrappedES.prototype = OrigES.prototype;
      Object.defineProperty(WrappedES, 'CONNECTING', { value: OrigES.CONNECTING });
      Object.defineProperty(WrappedES, 'OPEN', { value: OrigES.OPEN });
      Object.defineProperty(WrappedES, 'CLOSED', { value: OrigES.CLOSED });
      window.EventSource = WrappedES;

      const OrigWS = window.WebSocket;
      const trackedWs: WebSocket[] = [];
      (window as unknown as { __olwWsList?: WebSocket[] }).__olwWsList = trackedWs;
      const WrappedWS = function (
        this: WebSocket,
        url: string | URL,
        protocols?: string | string[],
      ) {
        const ws = protocols !== undefined ? new OrigWS(url, protocols) : new OrigWS(url);
        if (String(url).includes('/api/dev-lan/ws')) {
          trackedWs.push(ws);
        }
        return ws;
      } as unknown as typeof WebSocket;
      WrappedWS.prototype = OrigWS.prototype;
      Object.defineProperty(WrappedWS, 'CONNECTING', { value: OrigWS.CONNECTING });
      Object.defineProperty(WrappedWS, 'OPEN', { value: OrigWS.OPEN });
      Object.defineProperty(WrappedWS, 'CLOSING', { value: OrigWS.CLOSING });
      Object.defineProperty(WrappedWS, 'CLOSED', { value: OrigWS.CLOSED });
      window.WebSocket = WrappedWS;
    });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    attachWireTracker(pageA, wire);
    attachWireTracker(pageB, wire);

    await pageA.goto('/');
    await pageB.goto('/');
    await joinWorldPreset(pageA, 'preset-partner-a');
    await joinWorldPreset(pageB, 'preset-partner-b');

    const { modalA, modalB: initialModalB } = await startOnlineMatchViaLobby(pageA, pageB, {
      edition: '2d',
      rule: '9ball',
      startingPlayer: 0,
    });
    let modalB = initialModalB;

    // Shot 0 on Client A: clean pass shot (3 deg, 0.35 power -> no pocket, turn switches to 1)
    const state0 = await resolveCurrentBallsForModal(modalA, wire);
    await performUiShot(pageA, state0.balls, (3 * Math.PI) / 180, 0.35);

    await expect(modalA).toHaveAttribute('data-shot-seq', '1', { timeout: 15_000 });
    await expect(modalB).toHaveAttribute('data-shot-seq', '1', { timeout: 15_000 });
    await expect(modalA).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });
    await expect(modalB).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });

    const preReloadMatchId = await modalA.getAttribute('data-match-id');
    const preReloadSv = await modalA.getAttribute('data-state-version');
    const preReloadTurn = await modalA.getAttribute('data-current-player');
    const staleSettledCopy = wire.settledHistory[0]!;
    expect(staleSettledCopy).toBeTruthy();

    // 1) Between-shot full page reload on Client B -> reopen modal -> resume online -> recovers shots, replay button & state
    await pageB.reload();
    await joinWorldPreset(pageB, 'preset-partner-b', { afterReload: true });
    modalB = await resumeOnlineMatch(pageB, '2d');

    await expect(modalB).toHaveAttribute('data-match-id', preReloadMatchId!, { timeout: 15_000 });
    await expect(modalB).toHaveAttribute('data-state-version', preReloadSv!, { timeout: 15_000 });
    await expect(modalB).toHaveAttribute('data-shot-seq', '1', { timeout: 15_000 });
    await expect(modalB).toHaveAttribute('data-shot-count', '1', { timeout: 15_000 });
    await expect(modalB).toHaveAttribute('data-current-player', preReloadTurn!, { timeout: 15_000 });
    await expect(pageB.getByTestId('billiards-replay-btn')).toBeEnabled({ timeout: 5_000 });

    // Advance match by taking shot 1 on current turn owner so stateVersion moves ahead
    const turnOwner = Number(preReloadTurn!) as PlayerSlot;
    const turnPage = turnOwner === 0 ? pageA : pageB;
    const state1 = await resolveCurrentBallsForModal(turnOwner === 0 ? modalA : modalB, wire);
    const shot1Plan = pickNineBallShot(state1.balls, turnOwner, state1.canMoveCueBall, false);
    await performUiShot(turnPage, state1.balls, shot1Plan.angle, shot1Plan.power, shot1Plan.cueTarget);

    await expect(modalA).toHaveAttribute('data-shot-seq', '2', { timeout: 20_000 });
    await expect(modalB).toHaveAttribute('data-shot-seq', '2', { timeout: 20_000 });
    const svBeforeDelayed = Number(await modalB.getAttribute('data-state-version') ?? '0');

    // 2) Inject delayed stale settled packet from shot 0 via genuine server relay -> must be ignored
    const delayedRes = await request.post('/api/dev-lan/realtime', {
      headers: { 'x-dev-user-id': wire.partnerAUserId },
      data: {
        worldId: wire.worldId,
        kind: 'minigame_event',
        sessionId: 'delayed-packet-injector',
        payload: {
          type: 'MINIGAME_EVENT',
          gameId: 'billiards',
          matchId: staleSettledCopy.matchId,
          worldId: wire.worldId,
          actorUserId: wire.partnerAUserId,
          sessionId: 'delayed-packet-injector',
          seq: 999999,
          stateVersion: staleSettledCopy.stateVersion,
          payload: {
            type: 'billiards:settled',
            payload: staleSettledCopy,
          },
        },
      },
    });
    expect(delayedRes.ok()).toBe(true);
    await pageB.waitForTimeout(400);
    expect(Number(await modalB.getAttribute('data-state-version'))).toBe(svBeforeDelayed);
    expect(await modalB.getAttribute('data-shot-seq')).toBe('2');

    // 3) Mid-shot (in-flight) reconnect recovery: close B, current turn owner fires high-power shot, reopen B mid-flight
    await pageB.getByTestId('billiards-close').click();
    await expect(pageB.getByTestId('billiards-modal')).toBeHidden();

    const midTurn = Number(await modalA.getAttribute('data-current-player') ?? '0') as PlayerSlot;
    if (midTurn !== 0) {
      // If B owns turn 2, resume B cleanly first so a hard shot puts balls in motion on A
      modalB = await resumeOnlineMatch(pageB, '2d');
      const s2 = await resolveCurrentBallsForModal(modalB, wire);
      await performUiShot(pageB, s2.balls, (3 * Math.PI) / 180, 1.0);
      await expect(modalB).toHaveAttribute('data-phase', 'moving', { timeout: 5_000 });
      await expect(modalA).toHaveAttribute('data-phase', 'moving', { timeout: 5_000 });
      await expect(modalA).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
      await expect(modalB).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
    } else {
      const midMatchId = await modalA.getAttribute('data-match-id');
      const midState = await resolveCurrentBallsForModal(modalA, wire);
      await performUiShot(pageA, midState.balls, (3 * Math.PI) / 180, 1.0);
      await expect(modalA).toHaveAttribute('data-phase', 'moving', { timeout: 5_000 });

      // Open Client B while balls on Client A are still in motion
      await pageB.waitForTimeout(350);
      modalB = await resumeOnlineMatch(pageB, '2d');
      await expect(modalB).toHaveAttribute('data-match-id', midMatchId!, { timeout: 10_000 });
      await expect(modalB).toHaveAttribute('data-phase', 'moving', { timeout: 5_000 });

      // Wait for both clients to settle in sync
      await expect(modalA).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
      await expect(modalB).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
      await expect
        .poll(
          async () => {
            const svA = await modalA.getAttribute('data-state-version');
            const svB = await modalB.getAttribute('data-state-version');
            return svA === svB && Number(svA ?? '0') >= 2;
          },
          { timeout: 10_000 },
        )
        .toBe(true);
    }

    // 4) Safari background/SSE+WS termination while in active match -> visibilitychange/pageshow/online resume recovery
    await pageB.evaluate(() => {
      const w = window as unknown as {
        __olwHidden?: boolean;
        __olwEsList?: EventSource[];
        __olwWsList?: WebSocket[];
      };
      w.__olwHidden = true;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => Boolean(w.__olwHidden),
      });
      for (const es of w.__olwEsList ?? []) {
        es.close();
      }
      for (const ws of w.__olwWsList ?? []) {
        ws.close();
      }
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('offline'));
    });

    // If current turn is B, let Client B wake up first; if A owns turn, Client A shoots while B is offline
    const preBgOwner = Number(await modalA.getAttribute('data-current-player') ?? '0') as PlayerSlot;
    const preBgShotSeq = Number(await modalA.getAttribute('data-shot-seq') ?? '0');
    if (preBgOwner === 0) {
      const bgState = await resolveCurrentBallsForModal(modalA, wire);
      await performUiShot(pageA, bgState.balls, (2 * Math.PI) / 180, 0.45);
      await expect(modalA).toHaveAttribute('data-shot-seq', String(preBgShotSeq + 1), { timeout: 15_000 });
      await expect(modalA).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });
    }

    const reqBeforeResume = wire.stateRequestCount;
    await pageB.evaluate(() => {
      (window as unknown as { __olwHidden?: boolean }).__olwHidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pageshow'));
      window.dispatchEvent(new Event('online'));
    });

    await waitForMatchConvergence(modalA, modalB, { expectedRule: '9ball' });
    await expect
      .poll(
        async () =>
          Number(await modalB.getAttribute('data-shot-seq') ?? '0') ===
          Number(await modalA.getAttribute('data-shot-seq') ?? '0'),
        { timeout: 15_000 },
      )
      .toBe(true);
    expect(wire.stateRequestCount).toBeGreaterThan(reqBeforeResume);

    await ctxA.close();
    await ctxB.close();
  });

  test('maintains bounded DOM/heap across 10 modal open/close cycles and preserves overworld presence & input', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const errors: string[] = [];
    pageA.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console:${msg.text()}`);
    });
    pageA.on('pageerror', (err) => errors.push(`pageerror:${err.message}`));
    pageB.on('pageerror', (err) => errors.push(`pageerrorB:${err.message}`));

    await pageA.goto('/');
    await pageB.goto('/');
    const canvasA = await joinWorldPreset(pageA, 'preset-partner-a');
    const canvasB = await joinWorldPreset(pageB, 'preset-partner-b');

    await expect(pageA.getByTestId('partner-presence-pill')).toHaveClass(/pill--partner-online/, {
      timeout: 15_000,
    });

    const cdp = await ctxA.newCDPSession(pageA);
    await cdp.send('Performance.enable');
    await cdp.send('HeapProfiler.enable');
    const readPerf = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      const liveDomNodes = await pageA.evaluate(() => document.querySelectorAll('*').length);
      const { metrics } = await cdp.send('Performance.getMetrics');
      const map = Object.fromEntries(metrics.map((m) => [m.name, m.value]));
      return {
        liveDomNodes,
        cdpNodes: Math.round(map.Nodes ?? 0),
        jsHeapMB: Number(((map.JSHeapUsedSize ?? 0) / (1024 * 1024)).toFixed(2)),
      };
    };

    const beforeMetrics = await readPerf();
    let afterWarmupMetrics = beforeMetrics;

    for (let cycle = 1; cycle <= 10; cycle++) {
      const modal = await openBilliardsModal(pageA);
      await expect(canvasA).toHaveAttribute('data-render-suspended', '1', { timeout: 5_000 });

      if (cycle === 1) {
        // Partner continues moving in overworld while Client A has Billiards open; presence stays alive
        await pageB.keyboard.down('ArrowRight');
        await pageB.waitForTimeout(350);
        await pageB.keyboard.up('ArrowRight');
        expect(await canvasB.getAttribute('data-render-suspended')).toBe('0');
        await expect(pageA.getByTestId('partner-presence-pill')).toHaveClass(/pill--partner-online/);
      }

      await pageA.getByTestId('billiards-close').click();
      await expect(modal).toBeHidden();
      await expect(canvasA).toHaveAttribute('data-render-suspended', '0', { timeout: 5_000 });

      if (cycle === 1) {
        afterWarmupMetrics = await readPerf();
      }
    }

    const afterCycle10Metrics = await readPerf();
    console.log('[billiards-perf-metrics]', {
      beforeMetrics,
      afterWarmupMetrics,
      afterCycle10Metrics,
    });

    // Bounded live DOM & post-GC CDP node count across repeated open/close cycles
    expect(afterCycle10Metrics.liveDomNodes - afterWarmupMetrics.liveDomNodes).toBeLessThan(20);
    expect(afterCycle10Metrics.cdpNodes - afterWarmupMetrics.cdpNodes).toBeLessThan(250);

    // Verify overworld keyboard/canvas input & player movement resume cleanly after exit
    const startTileX = Number(await canvasA.getAttribute('data-player-tile-x') ?? '0');
    const startTileY = Number(await canvasA.getAttribute('data-player-tile-y') ?? '0');
    await canvasA.click({ position: { x: 640, y: 400 } });
    await pageA.keyboard.down('ArrowRight');
    await pageA.waitForTimeout(500);
    await pageA.keyboard.up('ArrowRight');
    await pageA.keyboard.down('ArrowDown');
    await pageA.waitForTimeout(500);
    await pageA.keyboard.up('ArrowDown');
    await expect
      .poll(
        async () => {
          const x = Number(await canvasA.getAttribute('data-player-tile-x') ?? '0');
          const y = Number(await canvasA.getAttribute('data-player-tile-y') ?? '0');
          return Math.abs(x - startTileX) + Math.abs(y - startTileY);
        },
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);

    expect(errors).toEqual([]);
    await ctxA.close();
    await ctxB.close();
  });
});
