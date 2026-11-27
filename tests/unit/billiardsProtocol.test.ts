import { describe, expect, it } from 'vitest';
import {
  BALL_R,
  FIXED_STEP_DT,
  MAX_SPEED,
  MIN_SPEED_SHOT,
  PLAY_L,
  PLAY_R,
  POCKETS,
  TABLE_H,
  cloneBalls,
  createInitialRack,
  evaluateShotRules,
  findOpenCueSpot,
  isPositionValidForCue,
  stepBilliardsFixedTick,
} from '../../src/shared/billiards/physicsEngine';
import {
  TURN_DURATION_MS,
  applyRemoteSettled,
  applyRemoteSnapshot,
  applyRemoteStart,
  beginShotOnState,
  buildMatchSnapshot,
  createInitialProtocolState,
  createLocalMatchStart,
  createLocalShot,
  shouldAnswerStateRequest,
  validateRemoteAim,
  validateRemotePlaceCue,
  validateRemoteShot,
  type BilliardsProtocolState,
} from '../../src/shared/billiards/protocol';
import type { MatchSnapshot, PlayerSlot, SettledStatePayload, ShotParams } from '../../src/shared/billiards/types';

function runPhysicsToRest(balls: ReturnType<typeof createInitialRack>, shot: ShotParams) {
  const next = cloneBalls(balls);
  const cue = next.find((b) => b.id === 0)!;
  cue.x = shot.cueX;
  cue.y = shot.cueY;
  const speed = MIN_SPEED_SHOT + Math.pow(shot.power, 1.32) * (MAX_SPEED - MIN_SPEED_SHOT);
  cue.vx = Math.cos(shot.angle) * speed;
  cue.vy = Math.sin(shot.angle) * speed;
  cue.rollVx = cue.vx * 0.14;
  cue.rollVy = cue.vy * 0.14;
  let moving = true;
  let guard = 0;
  while (moving && guard < 15_000) {
    guard++;
    moving = stepBilliardsFixedTick(next, {
      onFirstHit: () => {},
      onPocket: () => {},
      onBallHit: () => {},
      onCushion: () => {},
    });
  }
  return next;
}

describe('Billiards multiplayer protocol hardening (P0 #1-#7)', () => {
  it('uses canonical nextShotSeq independent of shots.length & recovers full replay history on reconnect', () => {
    const now = 1_700_000_000_000;
    const hostInit = createInitialProtocolState({
      matchId: 'host-boot',
      nowMs: now,
      hasAuthoritativeMatch: true,
      matchSeq: 1,
      initiatorSlot: 0,
    });
    const { nextState: hostStarted, startPayload } = createLocalMatchStart(hostInit, {
      rule: '8ball',
      startingPlayer: 0,
      seed: 123456,
      matchId: 'match-a',
      initiatorSlot: 0,
      nowMs: now,
    });

    const guestInit = createInitialProtocolState({
      matchId: 'guest-boot',
      nowMs: now,
      hasAuthoritativeMatch: false,
    });
    const guestStartedRes = applyRemoteStart(guestInit, startPayload, 1, now + 50, 0);
    expect(guestStartedRes.accepted).toBe(true);
    if (!guestStartedRes.accepted) return;

    // Host shoots shot 0
    const createdShot0 = createLocalShot(hostStarted, {
      angle: 0.02,
      power: 0.75,
      spinX: 0,
      spinY: 0,
      localPlayerSlot: 0,
      mode: 'online',
    });
    expect(createdShot0.ok).toBe(true);
    if (!createdShot0.ok) return;
    expect(createdShot0.shot.shotIndex).toBe(0);
    expect(createdShot0.shot.baseStateVersion).toBe(0);
    expect(createdShot0.shot.stateVersion).toBe(1);

    let hostState = beginShotOnState(hostStarted, createdShot0.shot);
    const settledBalls = runPhysicsToRest(hostStarted.balls, createdShot0.shot);
    hostState = {
      ...hostState,
      phase: 'aim',
      balls: settledBalls,
      preShotBalls: null,
      activeShotIndex: -1,
      currentPlayer: 1,
      stateVersion: 2,
      confirmedStateVersion: 2,
      scores: [1, 0],
      turnDeadlineMs: now + 31_000,
    };

    // Simulate canonical shot sequence diverging from shots.length (e.g. trimmed replay history)
    const snapshotFromHost = buildMatchSnapshot(hostState, 0, now + 1000);
    snapshotFromHost.nextShotSeq = 5;
    snapshotFromHost.shotCount = 5;
    // shots only holds 1 shot, yet nextShotSeq is 5!
    expect(snapshotFromHost.shots).toHaveLength(1);

    const recoveredGuest = applyRemoteSnapshot(
      guestStartedRes.nextState,
      snapshotFromHost,
      1,
      now + 1050,
      0,
    );
    expect(recoveredGuest.accepted).toBe(true);
    if (!recoveredGuest.accepted) return;

    // Canonical sequence must be 5, NOT shots.length (1)
    expect(recoveredGuest.nextState.nextShotSeq).toBe(5);
    expect(recoveredGuest.nextState.shots).toHaveLength(1);
    expect(recoveredGuest.nextState.lastShotSnap?.shot.shotIndex).toBe(0);
    expect(recoveredGuest.nextState.scores).toEqual([1, 0]);

    const guestNextShot = createLocalShot(recoveredGuest.nextState, {
      angle: 0.5,
      power: 0.6,
      spinX: 0,
      spinY: 0,
      localPlayerSlot: 1,
      mode: 'online',
    });
    expect(guestNextShot.ok).toBe(true);
    if (!guestNextShot.ok) return;
    expect(guestNextShot.shot.shotIndex).toBe(5);
    expect(guestNextShot.shot.baseStateVersion).toBe(2);
    expect(guestNextShot.shot.stateVersion).toBe(3);
  });

  it('rejects stale, duplicate, and out-of-order snapshots and settled packets', () => {
    const now = 1_700_000_000_000;
    const base = createInitialProtocolState({
      matchId: 'm1',
      nowMs: now,
      hasAuthoritativeMatch: true,
      matchSeq: 2,
      initiatorSlot: 0,
    });
    const advanced = {
      ...base,
      stateVersion: 4,
      confirmedStateVersion: 4,
      nextShotSeq: 2,
      currentPlayer: 1 as const,
    };

    const olderSnap: MatchSnapshot = {
      ...buildMatchSnapshot(advanced, 0, now),
      matchSeq: 2,
      stateVersion: 3,
      nextShotSeq: 1,
      shotCount: 1,
    };
    expect(applyRemoteSnapshot(advanced, olderSnap, 1, now, 0)).toEqual({
      accepted: false,
      reason: 'stale_version_snapshot',
    });

    const olderMatchSnap: MatchSnapshot = {
      ...buildMatchSnapshot(advanced, 0, now),
      matchId: 'm0',
      matchSeq: 1,
      stateVersion: 99,
    };
    expect(applyRemoteSnapshot(advanced, olderMatchSnap, 1, now, 0)).toEqual({
      accepted: false,
      reason: 'stale_match_snapshot',
    });

    const duplicateSnap = buildMatchSnapshot(advanced, 0, now);
    expect(applyRemoteSnapshot(advanced, duplicateSnap, 1, now, 0)).toEqual({
      accepted: false,
      reason: 'duplicate_snapshot',
    });

    const staleSettled: SettledStatePayload = {
      matchId: 'm1',
      matchSeq: 2,
      kind: 'shot_settled',
      actorSlot: 0,
      shotIndex: 1,
      shot: null,
      stateVersion: 4, // equal to confirmedStateVersion -> duplicate/stale
      nextShotSeq: 2,
      balls: cloneBalls(advanced.balls),
      groups: [null, null],
      nextPlayer: 1,
      ballInHand: false,
      isBreakShot: false,
      turnDeadlineMs: now + TURN_DURATION_MS,
      turnRemainingMs: TURN_DURATION_MS,
      returnedIds: [],
      scores: [0, 0],
      winner: null,
    };
    expect(applyRemoteSettled(advanced, staleSettled, 1, now, 0)).toEqual({
      accepted: false,
      reason: 'stale_or_duplicate_settled',
      shouldRequestSnapshot: false,
    });
  });

  it('recovers in-flight shots cleanly and never accepts moving balls as a settled aiming state', () => {
    const now = 1_700_000_000_000;
    const hostInit = createInitialProtocolState({
      matchId: 'm-flight',
      nowMs: now,
      hasAuthoritativeMatch: true,
      matchSeq: 1,
      initiatorSlot: 0,
    });
    const shotRes = createLocalShot(hostInit, {
      angle: 0,
      power: 0.9,
      spinX: 0,
      spinY: 0,
      localPlayerSlot: 0,
      mode: 'online',
    });
    expect(shotRes.ok).toBe(true);
    if (!shotRes.ok) return;

    const movingHost = beginShotOnState(hostInit, shotRes.shot);
    const cue = movingHost.balls.find((b) => b.id === 0)!;
    cue.vx = 900;
    cue.vy = 0;
    for (let i = 0; i < 10; i++) {
      stepBilliardsFixedTick(movingHost.balls, {
        onFirstHit: () => {},
        onPocket: () => {},
        onBallHit: () => {},
        onCushion: () => {},
      });
      movingHost.inFlightTicks += 1;
    }

    // Corrupt snapshot: balls are moving, but phase claims 'aim' -> MUST REJECT
    const bogusSettledSnap = buildMatchSnapshot(movingHost, 0, now, movingHost.balls, 'aim');
    const guest = createInitialProtocolState({
      matchId: 'guest-wait',
      nowMs: now,
      hasAuthoritativeMatch: false,
    });
    expect(applyRemoteSnapshot(guest, bogusSettledSnap, 1, now, 0)).toEqual({
      accepted: false,
      reason: 'moving_balls_in_settled_snapshot',
    });

    // Valid in-flight snapshot -> restores phase === 'moving' & exact ball velocities
    const validFlightSnap = buildMatchSnapshot(movingHost, 0, now);
    expect(validFlightSnap.phase).toBe('moving');
    expect(validFlightSnap.inFlightShot?.ticksElapsed).toBe(10);

    const recovered = applyRemoteSnapshot(guest, validFlightSnap, 1, now, 0);
    expect(recovered.accepted).toBe(true);
    if (!recovered.accepted) return;
    expect(recovered.nextState.phase).toBe('moving');
    expect(recovered.nextState.activeShotIndex).toBe(0);
    expect(recovered.nextState.inFlightTicks).toBe(10);
    expect(recovered.nextState.balls.find((b) => b.id === 0)?.vx).toBeCloseTo(cue.vx, 6);
    expect(FIXED_STEP_DT).toBe(1 / 120);
  });

  it('resolves simultaneous start/reset races deterministically (slot 0 wins equal matchSeq; higher matchSeq wins)', () => {
    const now = 1_700_000_000_000;
    const p0Empty = createInitialProtocolState({
      matchId: 'p0-init',
      nowMs: now,
      hasAuthoritativeMatch: false,
    });
    const p1Empty = createInitialProtocolState({
      matchId: 'p1-init',
      nowMs: now,
      hasAuthoritativeMatch: false,
    });

    const p0Start = createLocalMatchStart(p0Empty, {
      rule: '8ball',
      startingPlayer: 0,
      seed: 111,
      matchId: 'match-slot0',
      initiatorSlot: 0,
      nowMs: now,
    });
    const p1Start = createLocalMatchStart(p1Empty, {
      rule: '9ball',
      startingPlayer: 0,
      seed: 222,
      matchId: 'match-slot1',
      initiatorSlot: 1,
      nowMs: now + 5,
    });

    // P0 receives P1's concurrent matchSeq=1 start -> P0 rejects and rebroadcasts authoritative match
    const onP0 = applyRemoteStart(p0Start.nextState, p1Start.startPayload, 0, now + 10, 1);
    expect(onP0).toEqual({
      accepted: false,
      reason: 'lost_start_race',
      shouldRebroadcastAuthoritative: true,
    });

    // P1 receives P0's matchSeq=1 start -> P1 yields and adopts P0's match!
    const onP1 = applyRemoteStart(p1Start.nextState, p0Start.startPayload, 1, now + 10, 0);
    expect(onP1.accepted).toBe(true);
    if (!onP1.accepted) return;
    expect(onP1.nextState.matchId).toBe('match-slot0');
    expect(onP1.nextState.rule).toBe('8ball');

    // Explicit rematch from slot 1 gets matchSeq = 2 -> accepted by slot 0, and old match is retired
    const p1Rematch = createLocalMatchStart(onP1.nextState, {
      rule: '9ball',
      startingPlayer: 1,
      seed: 333,
      matchId: 'match-rematch-2',
      initiatorSlot: 1,
      nowMs: now + 1000,
    });
    const p0AdoptRematch = applyRemoteStart(p0Start.nextState, p1Rematch.startPayload, 0, now + 1020, 1);
    expect(p0AdoptRematch.accepted).toBe(true);
    if (!p0AdoptRematch.accepted) return;
    expect(p0AdoptRematch.nextState.retiredMatchIds).toContain('match-slot0');
  });

  it('validates shot phase, sequence, participant, cue position, turn ownership, and clock skew', () => {
    const now = 1_700_000_000_000;
    const host = createInitialProtocolState({
      matchId: 'm-val',
      nowMs: now,
      hasAuthoritativeMatch: true,
      matchSeq: 1,
      initiatorSlot: 0,
    });
    const guest = createInitialProtocolState({
      matchId: 'm-val',
      nowMs: now,
      hasAuthoritativeMatch: true,
      matchSeq: 1,
      initiatorSlot: 0,
    });

    // Spoofed sender slot rejected
    expect(
      validateRemoteAim(
        guest,
        { matchId: 'm-val', stateVersion: 0, playerSlot: 0, angle: 0.2, power: 0.5 },
        1,
        1,
      ),
    ).toBe(false);

    // Out-of-turn cue placement rejected
    expect(
      validateRemotePlaceCue(
        { ...guest, canMoveCueBall: true, currentPlayer: 1 },
        { matchId: 'm-val', stateVersion: 0, playerSlot: 0, x: PLAY_L + 200, y: TABLE_H / 2 },
        1,
        0,
      ),
    ).toBe(false);

    // Out-of-turn shot rejected
    const badTurnShot: ShotParams = {
      matchId: 'm-val',
      shotIndex: 0,
      baseStateVersion: 0,
      stateVersion: 1,
      playerSlot: 1,
      angle: 0,
      power: 0.5,
      spinX: 0,
      spinY: 0,
      elevationDeg: 0,
      cueX: host.balls[0]!.x,
      cueY: host.balls[0]!.y,
    };
    expect(validateRemoteShot(host, badTurnShot, 0, 1).ok).toBe(false);

    // Teleported cue ball when NOT ball-in-hand rejected
    const teleportShot: ShotParams = {
      ...badTurnShot,
      playerSlot: 0,
      cueX: PLAY_L + 120,
    };
    expect(validateRemoteShot(guest, teleportShot, 1, 0)).toEqual({
      ok: false,
      reason: 'cue_position_mismatch',
      shouldRequestSnapshot: false,
    });

    // Naturally rail-frozen cue ball allowed when NOT ball-in-hand, rejected if ball-in-hand
    const railFrozenHost: BilliardsProtocolState = {
      ...host,
      canMoveCueBall: false,
      balls: host.balls.map((b) => (b.id === 0 ? { ...b, x: PLAY_L + BALL_R } : b)),
    };
    const railFrozenGuest: BilliardsProtocolState = {
      ...railFrozenHost,
    };
    const frozenShot = createLocalShot(railFrozenHost, {
      angle: 0,
      power: 0.5,
      spinX: 0,
      spinY: 0,
      localPlayerSlot: 0,
      mode: 'online',
    });
    expect(frozenShot.ok).toBe(true);
    if (frozenShot.ok) {
      expect(validateRemoteShot(railFrozenGuest, frozenShot.shot, 1, 0)).toEqual({ ok: true });
    }
    const ballInHandFrozen = { ...railFrozenHost, canMoveCueBall: true };
    expect(
      createLocalShot(ballInHandFrozen, {
        angle: 0,
        power: 0.5,
        spinX: 0,
        spinY: 0,
        localPlayerSlot: 0,
        mode: 'online',
      }),
    ).toEqual({ ok: false, reason: 'invalid_cue_position' });
    if (frozenShot.ok) {
      expect(
        validateRemoteShot({ ...railFrozenGuest, canMoveCueBall: true }, frozenShot.shot, 1, 0),
      ).toEqual({
        ok: false,
        reason: 'invalid_cue_position',
        shouldRequestSnapshot: false,
      });
    }

    // Sequence gap asks for snapshot recovery
    const gapShot: ShotParams = {
      ...badTurnShot,
      playerSlot: 0,
      shotIndex: 2,
      baseStateVersion: 2,
      stateVersion: 3,
      cueX: guest.balls[0]!.x,
      cueY: guest.balls[0]!.y,
    };
    expect(validateRemoteShot(guest, gapShot, 1, 0)).toEqual({
      ok: false,
      reason: 'sequence_gap',
      shouldRequestSnapshot: true,
    });

    // State request ignores peer that is ahead of us and triggers peer request
    expect(
      shouldAnswerStateRequest(guest, {
        requesterSlot: 0,
        currentMatchId: 'm-val',
        currentMatchSeq: 2,
        currentStateVersion: 0,
      }),
    ).toEqual({ respond: false, shouldRequestPeer: true });

    // Clock-skew tolerance restores accurate turnDeadlineMs from turnRemainingMs
    const skewedSnap = buildMatchSnapshot(host, 0, now);
    skewedSnap.turnDeadlineMs = now + 999_999; // +999s clock skew on remote clock
    skewedSnap.turnRemainingMs = 20_000;
    const skewedGuest = applyRemoteSnapshot(
      createInitialProtocolState({ matchId: 'x', nowMs: now, hasAuthoritativeMatch: false }),
      skewedSnap,
      1,
      now,
      0,
    );
    expect(skewedGuest.accepted).toBe(true);
    if (skewedGuest.accepted) {
      expect(skewedGuest.nextState.turnDeadlineMs).toBe(now + 20_000);
    }
  });

  it('completes a full multi-shot 9-ball match across two independent protocol clients with delayed packets and reconnects', () => {
    const now0 = 1_700_000_050_000;
    let now = now0;

    const hostInit = createInitialProtocolState({
      matchId: 'sim-boot-0',
      nowMs: now,
      hasAuthoritativeMatch: false,
    });
    const { nextState: c0Start, startPayload } = createLocalMatchStart(hostInit, {
      rule: '9ball',
      startingPlayer: 0,
      seed: 42,
      matchId: 'match-full-9ball',
      initiatorSlot: 0,
      nowMs: now,
    });

    const guestInit = createInitialProtocolState({
      matchId: 'sim-boot-1',
      nowMs: now,
      hasAuthoritativeMatch: false,
    });
    const c1Start = applyRemoteStart(guestInit, startPayload, 1, now + 25, 0);
    expect(c1Start.accepted).toBe(true);
    if (!c1Start.accepted) return;

    const clients: [BilliardsProtocolState, BilliardsProtocolState] = [c0Start, c1Start.nextState];
    let delayedStaleSettled: SettledStatePayload | null = null;
    let delayedOldShot: ShotParams | null = null;
    let midShotReconnectVerified = false;
    let betweenShotReconnectVerified = false;

    const settleLocally = (
      proto: BilliardsProtocolState,
      actorSlot: PlayerSlot,
      shot: ShotParams,
      settledAt: number,
    ): { next: BilliardsProtocolState; packet: SettledStatePayload } => {
      const work = cloneBalls(proto.balls);
      if (proto.inFlightTicks === 0) {
        const cueW = work.find((b) => b.id === 0)!;
        const spd = MIN_SPEED_SHOT + Math.pow(shot.power, 1.32) * (MAX_SPEED - MIN_SPEED_SHOT);
        cueW.vx = Math.cos(shot.angle) * spd;
        cueW.vy = Math.sin(shot.angle) * spd;
        cueW.rollVx = cueW.vx * 0.14;
        cueW.rollVy = cueW.vy * 0.14;
      }
      let firstHit: number | null = proto.shotFirstHit;
      const pocketed: number[] = [...proto.shotPocketed];
      let cueScratched = proto.cueScratched;
      const returnedIds = [...proto.returnedIds];
      while (
        stepBilliardsFixedTick(work, {
          onFirstHit: (id) => {
            if (firstHit === null) firstHit = id;
          },
          onPocket: (b) => {
            if (b.id === 0) cueScratched = true;
            else {
              pocketed.push(b.id);
              if (!returnedIds.includes(b.id)) returnedIds.push(b.id);
            }
          },
          onBallHit: () => {},
          onCushion: () => {},
        })
      ) {
        // advance to rest
      }

      const outcome = evaluateShotRules({
        rule: proto.rule,
        balls: work,
        currentPlayer: actorSlot,
        groups: proto.groups,
        isBreakShot: proto.isBreakShot,
        wasOnEightBeforeShot: proto.shotWasOnEight,
        firstHit,
        pocketed,
        scratched: cueScratched,
        playerNames: ['Minh', 'Linh'],
      });

      let cleanedReturned = [...returnedIds];
      if (outcome.respotNine) {
        const b9 = work.find((b) => b.id === 9);
        if (b9) {
          b9.pocketed = false;
          b9.x = PLAY_L + (PLAY_R - PLAY_L) * 0.73;
          b9.y = TABLE_H / 2;
          b9.vx = 0;
          b9.vy = 0;
          b9.rollVx = 0;
          b9.rollVy = 0;
          b9.spinZ = 0;
        }
        cleanedReturned = cleanedReturned.filter((id) => id !== 9);
      }

      const nextScores =
        outcome.winner && proto.scoredMatchId !== proto.matchId
          ? outcome.winner.slot === 0
            ? ([proto.scores[0] + 1, proto.scores[1]] as [number, number])
            : ([proto.scores[0], proto.scores[1] + 1] as [number, number])
          : ([proto.scores[0], proto.scores[1]] as [number, number]);

      if (!outcome.winner && outcome.ballInHand) {
        const cue = work.find((b) => b.id === 0)!;
        const spot = findOpenCueSpot(work);
        cue.pocketed = false;
        cue.x = spot.x;
        cue.y = spot.y;
        cue.vx = 0;
        cue.vy = 0;
        cue.rollVx = 0;
        cue.rollVy = 0;
        cue.spinZ = 0;
      }

      const nextDeadline = settledAt + TURN_DURATION_MS;
      const nextStateVersion = proto.stateVersion + 1;
      const nextProto: BilliardsProtocolState = {
        ...proto,
        phase: outcome.winner ? 'gameOver' : 'aim',
        stateVersion: nextStateVersion,
        confirmedStateVersion: nextStateVersion,
        provisionalSettledShotIndex: null,
        activeShotIndex: -1,
        inFlightTicks: 0,
        balls: cloneBalls(work),
        preShotBalls: null,
        groups: [outcome.groups[0], outcome.groups[1]],
        currentPlayer: outcome.winner ? proto.currentPlayer : outcome.nextPlayer,
        canMoveCueBall: outcome.winner ? false : outcome.ballInHand,
        isBreakShot: false,
        turnDeadlineMs: nextDeadline,
        returnedIds: cleanedReturned,
        scores: nextScores,
        scoredMatchId: outcome.winner ? proto.matchId : proto.scoredMatchId,
        winner: outcome.winner ? { ...outcome.winner } : null,
        shotFirstHit: null,
        shotPocketed: [],
        shotWasOnEight: false,
        cueScratched: false,
      };

      const packet: SettledStatePayload = {
        matchId: nextProto.matchId,
        matchSeq: nextProto.matchSeq,
        kind: 'shot_settled',
        actorSlot,
        shotIndex: shot.shotIndex,
        shot: { ...shot },
        stateVersion: nextProto.stateVersion,
        nextShotSeq: nextProto.nextShotSeq,
        balls: cloneBalls(nextProto.balls),
        groups: [nextProto.groups[0], nextProto.groups[1]],
        nextPlayer: nextProto.currentPlayer,
        ballInHand: nextProto.canMoveCueBall,
        isBreakShot: false,
        turnDeadlineMs: nextDeadline,
        turnRemainingMs: TURN_DURATION_MS,
        returnedIds: [...nextProto.returnedIds],
        scores: [nextProto.scores[0], nextProto.scores[1]],
        winner: nextProto.winner ? { ...nextProto.winner } : null,
        foulMessage: outcome.foulMessage,
        bannerTitle: outcome.bannerTitle,
        bannerSub: outcome.bannerSub,
      };
      return { next: nextProto, packet };
    };

    const pickShotCandidate = (state: BilliardsProtocolState): { cuePos?: { x: number; y: number }; angle: number; power: number } => {
      if (state.nextShotSeq === 0) {
        return { angle: (0.5 * Math.PI) / 180, power: 0.9 };
      }
      const rem = state.balls.filter((b) => b.id !== 0 && !b.pocketed).sort((a, b) => a.id - b.id);
      const low = rem[0]!;
      const cue = state.balls.find((b) => b.id === 0)!;
      const nine = state.balls.find((b) => b.id === 9 && !b.pocketed);
      const cueSpots: Array<{ x: number; y: number } | undefined> = [undefined];
      if (state.canMoveCueBall) {
        for (const p of POCKETS) {
          const dx = p.x - low.x;
          const dy = p.y - low.y;
          const dist = Math.hypot(dx, dy) || 1;
          for (const mul of [2.5, 4.0]) {
            const cx = low.x - (dx / dist) * (BALL_R * mul);
            const cy = low.y - (dy / dist) * (BALL_R * mul);
            if (isPositionValidForCue(state.balls, cx, cy)) cueSpots.push({ x: cx, y: cy });
          }
        }
      }
      let best: { cuePos?: { x: number; y: number }; angle: number; power: number; score: number } | null = null;
      const tryCand = (cp: { x: number; y: number } | undefined, angle: number, power: number) => {
        const sim = cloneBalls(state.balls);
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
        let fh: number | null = null;
        const pock: number[] = [];
        while (
          stepBilliardsFixedTick(sim, {
            onFirstHit: (id) => {
              if (fh === null) fh = id;
            },
            onPocket: (b) => pock.push(b.id),
            onBallHit: () => {},
            onCushion: () => {},
          })
        ) {
          // settle
        }
        const out = evaluateShotRules({
          rule: state.rule,
          balls: sim,
          currentPlayer: state.currentPlayer,
          groups: state.groups,
          isBreakShot: false,
          wasOnEightBeforeShot: false,
          firstHit: fh,
          pocketed: pock.filter((id) => id !== 0),
          scratched: pock.includes(0),
          playerNames: ['Minh', 'Linh'],
        });
        if (out.winner && out.winner.slot === state.currentPlayer) {
          best = { cuePos: cp, angle, power, score: 10_000 };
          return true;
        }
        if (fh === low.id && !pock.includes(0)) {
          const sc = pock.length * 10 + (out.nextPlayer === state.currentPlayer ? 5 : 0);
          if (!best || sc > best.score) {
            best = { cuePos: cp, angle, power, score: sc };
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
          angle: Math.atan2(low.y - cue.y, low.x - cue.x),
          power: 0.65,
        }
      );
    };

    let guard = 0;
    while (clients[0].phase !== 'gameOver' && guard < 25) {
      guard++;
      now += 1500;
      const shooterSlot = clients[0].currentPlayer;
      const receiverSlot: PlayerSlot = shooterSlot === 0 ? 1 : 0;
      let shooter = clients[shooterSlot];
      let receiver = clients[receiverSlot];

      const chosen = pickShotCandidate(shooter);
      if (shooter.canMoveCueBall && chosen.cuePos) {
        const cuePlace = {
          matchId: shooter.matchId,
          stateVersion: shooter.stateVersion,
          playerSlot: shooterSlot,
          x: chosen.cuePos.x,
          y: chosen.cuePos.y,
        };
        expect(validateRemotePlaceCue(receiver, cuePlace, receiverSlot, shooterSlot)).toBe(true);
        shooter.balls.find((b) => b.id === 0)!.x = cuePlace.x;
        shooter.balls.find((b) => b.id === 0)!.y = cuePlace.y;
        receiver.balls.find((b) => b.id === 0)!.x = cuePlace.x;
        receiver.balls.find((b) => b.id === 0)!.y = cuePlace.y;
      }

      const created = createLocalShot(shooter, {
        angle: chosen.angle,
        power: chosen.power,
        spinX: 0,
        spinY: 0,
        localPlayerSlot: shooterSlot,
        mode: 'online',
      });
      expect(created.ok).toBe(true);
      if (!created.ok) break;
      if (!delayedOldShot) delayedOldShot = created.shot;

      expect(validateRemoteShot(receiver, created.shot, receiverSlot, shooterSlot)).toEqual({ ok: true });
      shooter = beginShotOnState(shooter, created.shot);
      receiver = beginShotOnState(receiver, created.shot);

      // Test mid-shot reconnect during shot #1: client 1 disconnects and rejoins after 15 physics ticks
      if (created.shot.shotIndex === 0 && !midShotReconnectVerified) {
        const cueS = shooter.balls.find((b) => b.id === 0)!;
        const spd =
          MIN_SPEED_SHOT + Math.pow(created.shot.power, 1.32) * (MAX_SPEED - MIN_SPEED_SHOT);
        cueS.vx = Math.cos(created.shot.angle) * spd;
        cueS.vy = Math.sin(created.shot.angle) * spd;
        cueS.rollVx = cueS.vx * 0.14;
        cueS.rollVy = cueS.vy * 0.14;
        for (let t = 0; t < 15; t++) {
          stepBilliardsFixedTick(shooter.balls, {
            onFirstHit: (id) => {
              if (shooter.shotFirstHit === null) shooter.shotFirstHit = id;
            },
            onPocket: (b) => {
              if (b.id === 0) shooter.cueScratched = true;
              else shooter.shotPocketed.push(b.id);
            },
            onBallHit: () => {},
            onCushion: () => {},
          });
          shooter.inFlightTicks += 1;
        }
        const midSnap = buildMatchSnapshot(shooter, shooterSlot, now);
        expect(midSnap.phase).toBe('moving');
        expect(midSnap.inFlightShot?.ticksElapsed).toBe(15);

        const freshRejoin = createInitialProtocolState({
          matchId: 'fresh-rejoin',
          nowMs: now + 5,
          hasAuthoritativeMatch: false,
        });
        const recovered = applyRemoteSnapshot(freshRejoin, midSnap, 1, now + 5, 0);
        expect(recovered.accepted).toBe(true);
        if (!recovered.accepted) break;
        expect(recovered.nextState.phase).toBe('moving');
        expect(recovered.nextState.inFlightTicks).toBe(15);
        expect(recovered.nextState.balls[0]!.x).toBeCloseTo(shooter.balls[0]!.x, 6);
        midShotReconnectVerified = true;
      }

      const settled = settleLocally(shooter, shooterSlot, created.shot, now + 800);
      if (!delayedStaleSettled) delayedStaleSettled = settled.packet;
      shooter = settled.next;

      const remoteSettled = applyRemoteSettled(
        receiver,
        settled.packet,
        receiverSlot,
        now + 820,
        shooterSlot,
      );
      expect(remoteSettled.accepted).toBe(true);
      if (!remoteSettled.accepted) break;
      receiver = remoteSettled.nextState;

      clients[shooterSlot] = shooter;
      clients[receiverSlot] = receiver;

      // Test between-shot reconnect recovery after shot #2
      if (shooter.nextShotSeq === 2 && !betweenShotReconnectVerified) {
        const snap = buildMatchSnapshot(clients[0], 0, now + 900);
        const freshC1 = createInitialProtocolState({
          matchId: 'rejoin-between',
          nowMs: now + 910,
          hasAuthoritativeMatch: false,
        });
        const rec = applyRemoteSnapshot(freshC1, snap, 1, now + 910, 0);
        expect(rec.accepted).toBe(true);
        if (!rec.accepted) break;
        expect(rec.nextState.shots.map((s) => s.shotIndex)).toEqual([0, 1]);
        expect(rec.nextState.nextShotSeq).toBe(2);
        expect(rec.nextState.lastShotSnap?.shot.shotIndex).toBe(1);
        clients[1] = rec.nextState;
        betweenShotReconnectVerified = true;
      }

      // Inject delayed/stale shot & settled packets once match advances past shot 2
      if (shooter.nextShotSeq >= 2 && delayedStaleSettled && delayedOldShot) {
        expect(validateRemoteShot(clients[1], delayedOldShot, 1, 0)).toEqual({
          ok: false,
          reason: 'duplicate_shot_index',
          shouldRequestSnapshot: false,
        });
        expect(applyRemoteSettled(clients[1], delayedStaleSettled, 1, now + 950, 0)).toEqual({
          accepted: false,
          reason: 'stale_or_duplicate_settled',
          shouldRequestSnapshot: false,
        });
      }
    }

    expect(midShotReconnectVerified).toBe(true);
    expect(betweenShotReconnectVerified).toBe(true);
    expect(clients[0].phase).toBe('gameOver');
    expect(clients[1].phase).toBe('gameOver');
    expect(clients[0].winner).toEqual(clients[1].winner);
    expect(clients[0].scores).toEqual(clients[1].scores);
    expect(clients[0].scores[0] + clients[0].scores[1]).toBe(1);
    expect(clients[0].nextShotSeq).toBe(clients[1].nextShotSeq);
    expect(clients[0].shots.length).toBe(clients[0].nextShotSeq);
    expect(clients[1].shots.length).toBe(clients[1].nextShotSeq);

    // Duplicate winner snapshot replay must not increment scores twice
    const winSnap = buildMatchSnapshot(clients[0], 0, now + 1200);
    const dupRes = applyRemoteSnapshot(clients[1], winSnap, 1, now + 1250, 0);
    if (dupRes.accepted) {
      expect(dupRes.nextState.scores).toEqual(clients[1].scores);
    }
  });
});
