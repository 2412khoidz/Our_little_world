import {
  PLAY_B,
  PLAY_L,
  PLAY_R,
  PLAY_T,
  areBallsValidForRule,
  canShootEight,
  cloneBalls,
  createInitialRack,
  hasMovingBalls,
  isPositionValidForCue,
} from './physicsEngine';
import type {
  AimSyncPayload,
  BallGroup,
  BallState,
  BilliardsMatchPhase,
  BilliardsPlayMode,
  BilliardsRule,
  MatchSnapshot,
  MatchStartPayload,
  PlaceCuePayload,
  PlayerSlot,
  ScoresTuple,
  SettledStatePayload,
  ShotParams,
  StateRequestPayload,
  WinnerInfo,
} from './types';

export const TURN_DURATION_MS = 30_000;
export const OPPONENT_TIMEOUT_GRACE_MS = 2_500;
export const CUE_POSITION_TOLERANCE_PX = 2.0;
export const MAX_RETIRED_MATCH_IDS = 32;

function isCueWithinTableBounds(x: number, y: number): boolean {
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= PLAY_L - 4 &&
    x <= PLAY_R + 4 &&
    y >= PLAY_T - 4 &&
    y <= PLAY_B + 4
  );
}

export interface LastShotSnapshot {
  balls: BallState[];
  shot: ShotParams;
}

export interface BilliardsProtocolState {
  hasAuthoritativeMatch: boolean;
  matchId: string;
  matchSeq: number;
  initiatorSlot: PlayerSlot;
  createdAtMs: number;
  startedAtMs: number;
  rule: BilliardsRule;
  rackSeed: number;
  phase: BilliardsMatchPhase;
  stateVersion: number;
  confirmedStateVersion: number;
  nextShotSeq: number;
  provisionalSettledShotIndex: number | null;
  activeShotIndex: number;
  inFlightTicks: number;
  balls: BallState[];
  preShotBalls: BallState[] | null;
  groups: [BallGroup, BallGroup];
  currentPlayer: PlayerSlot;
  canMoveCueBall: boolean;
  isBreakShot: boolean;
  turnDeadlineMs: number;
  returnedIds: number[];
  scores: ScoresTuple;
  scoredMatchId: string | null;
  winner: WinnerInfo | null;
  shots: ShotParams[];
  lastShotSnap: LastShotSnapshot | null;
  shotFirstHit: number | null;
  shotPocketed: number[];
  shotWasOnEight: boolean;
  cueScratched: boolean;
  retiredMatchIds: string[];
}

export function createInitialProtocolState(params: {
  rule?: BilliardsRule;
  seed?: number;
  matchId: string;
  initialScores?: ScoresTuple;
  nowMs: number;
  hasAuthoritativeMatch: boolean;
  matchSeq?: number;
  initiatorSlot?: PlayerSlot;
}): BilliardsProtocolState {
  const rule = params.rule ?? '8ball';
  const seed = params.seed ?? 20261126;
  const initialScores: ScoresTuple = params.initialScores
    ? [params.initialScores[0], params.initialScores[1]]
    : [0, 0];
  return {
    hasAuthoritativeMatch: params.hasAuthoritativeMatch,
    matchId: params.matchId,
    matchSeq: params.matchSeq ?? (params.hasAuthoritativeMatch ? 1 : 0),
    initiatorSlot: params.initiatorSlot ?? 0,
    createdAtMs: params.nowMs,
    startedAtMs: params.nowMs,
    rule,
    rackSeed: seed,
    phase: 'aim',
    stateVersion: 0,
    confirmedStateVersion: 0,
    nextShotSeq: 0,
    provisionalSettledShotIndex: null,
    activeShotIndex: -1,
    inFlightTicks: 0,
    balls: createInitialRack(rule, seed),
    preShotBalls: null,
    groups: [null, null],
    currentPlayer: 0,
    canMoveCueBall: false,
    isBreakShot: true,
    turnDeadlineMs: params.nowMs + TURN_DURATION_MS,
    returnedIds: [],
    scores: initialScores,
    scoredMatchId: null,
    winner: null,
    shots: [],
    lastShotSnap: null,
    shotFirstHit: null,
    shotPocketed: [],
    shotWasOnEight: false,
    cueScratched: false,
    retiredMatchIds: [],
  };
}

export function compareMatchOrder(
  a: { matchSeq: number; initiatorSlot: PlayerSlot; matchId: string },
  b: { matchSeq: number; initiatorSlot: PlayerSlot; matchId: string },
): number {
  if (a.matchSeq !== b.matchSeq) {
    return a.matchSeq > b.matchSeq ? 1 : -1;
  }
  if (a.matchId === b.matchId) return 0;
  // Deterministic simultaneous-start tie-breaker: slot 0 (owner) always wins over slot 1
  if (a.initiatorSlot !== b.initiatorSlot) {
    return a.initiatorSlot < b.initiatorSlot ? 1 : -1;
  }
  return a.matchId < b.matchId ? 1 : -1;
}

export function resolveTurnDeadlineMs(
  turnDeadlineMs: number,
  turnRemainingMs: number,
  nowMs: number,
): number {
  const clampedRemaining = Math.max(0, Math.min(TURN_DURATION_MS * 4, turnRemainingMs));
  const rawRemaining = turnDeadlineMs - nowMs;
  if (Math.abs(rawRemaining - clampedRemaining) > 1500) {
    return nowMs + clampedRemaining;
  }
  return turnDeadlineMs;
}

export function retireMatchId(retired: readonly string[], matchId: string): string[] {
  if (!matchId) return [...retired];
  const filtered = retired.filter((id) => id !== matchId);
  filtered.push(matchId);
  if (filtered.length > MAX_RETIRED_MATCH_IDS) {
    return filtered.slice(filtered.length - MAX_RETIRED_MATCH_IDS);
  }
  return filtered;
}

export function validateParticipantSlot(
  claimedSlot: PlayerSlot,
  localPlayerSlot: PlayerSlot,
  verifiedSenderSlot?: PlayerSlot,
): boolean {
  if (claimedSlot === localPlayerSlot) return false;
  if (verifiedSenderSlot !== undefined && verifiedSenderSlot !== claimedSlot) {
    return false;
  }
  return true;
}

export function createLocalMatchStart(
  state: BilliardsProtocolState,
  params: {
    rule: BilliardsRule;
    startingPlayer: PlayerSlot;
    seed: number;
    matchId: string;
    initiatorSlot: PlayerSlot;
    nowMs: number;
  },
): { nextState: BilliardsProtocolState; startPayload: MatchStartPayload } {
  const nextSeq = state.hasAuthoritativeMatch ? Math.max(1, state.matchSeq + 1) : 1;
  const retired = state.hasAuthoritativeMatch
    ? retireMatchId(state.retiredMatchIds, state.matchId)
    : [...state.retiredMatchIds];
  const turnDeadlineMs = params.nowMs + TURN_DURATION_MS;
  const scores: ScoresTuple = [state.scores[0], state.scores[1]];

  const nextState: BilliardsProtocolState = {
    hasAuthoritativeMatch: true,
    matchId: params.matchId,
    matchSeq: nextSeq,
    initiatorSlot: params.initiatorSlot,
    createdAtMs: params.nowMs,
    startedAtMs: params.nowMs,
    rule: params.rule,
    rackSeed: params.seed,
    phase: 'aim',
    stateVersion: 0,
    confirmedStateVersion: 0,
    nextShotSeq: 0,
    provisionalSettledShotIndex: null,
    activeShotIndex: -1,
    inFlightTicks: 0,
    balls: createInitialRack(params.rule, params.seed),
    preShotBalls: null,
    groups: [null, null],
    currentPlayer: params.startingPlayer,
    canMoveCueBall: false,
    isBreakShot: true,
    turnDeadlineMs,
    returnedIds: [],
    scores,
    scoredMatchId: null,
    winner: null,
    shots: [],
    lastShotSnap: null,
    shotFirstHit: null,
    shotPocketed: [],
    shotWasOnEight: false,
    cueScratched: false,
    retiredMatchIds: retired,
  };

  const startPayload: MatchStartPayload = {
    matchId: params.matchId,
    matchSeq: nextSeq,
    initiatorSlot: params.initiatorSlot,
    createdAtMs: params.nowMs,
    rule: params.rule,
    rackSeed: params.seed,
    startingPlayer: params.startingPlayer,
    turnDeadlineMs,
    turnRemainingMs: TURN_DURATION_MS,
    scores,
  };

  return { nextState, startPayload };
}

export type RemoteStartResult =
  | { accepted: true; nextState: BilliardsProtocolState }
  | {
      accepted: false;
      reason: 'invalid_sender' | 'retired_match' | 'duplicate_start' | 'lost_start_race';
      shouldRebroadcastAuthoritative: boolean;
    };

export function applyRemoteStart(
  state: BilliardsProtocolState,
  payload: MatchStartPayload,
  localPlayerSlot: PlayerSlot,
  nowMs: number,
  verifiedSenderSlot?: PlayerSlot,
): RemoteStartResult {
  if (!validateParticipantSlot(payload.initiatorSlot, localPlayerSlot, verifiedSenderSlot)) {
    return {
      accepted: false,
      reason: 'invalid_sender',
      shouldRebroadcastAuthoritative: false,
    };
  }
  if (state.retiredMatchIds.includes(payload.matchId)) {
    return {
      accepted: false,
      reason: 'retired_match',
      shouldRebroadcastAuthoritative: false,
    };
  }

  if (state.hasAuthoritativeMatch) {
    const cmp = compareMatchOrder(payload, state);
    if (cmp === 0) {
      return {
        accepted: false,
        reason: 'duplicate_start',
        shouldRebroadcastAuthoritative: false,
      };
    }
    if (cmp < 0) {
      return {
        accepted: false,
        reason: 'lost_start_race',
        shouldRebroadcastAuthoritative: true,
      };
    }
  }

  const retired = state.hasAuthoritativeMatch
    ? retireMatchId(state.retiredMatchIds, state.matchId)
    : [...state.retiredMatchIds];
  const turnDeadlineMs = resolveTurnDeadlineMs(
    payload.turnDeadlineMs,
    payload.turnRemainingMs,
    nowMs,
  );
  const scores: ScoresTuple = [
    Math.max(state.scores[0], payload.scores[0]),
    Math.max(state.scores[1], payload.scores[1]),
  ];

  return {
    accepted: true,
    nextState: {
      hasAuthoritativeMatch: true,
      matchId: payload.matchId,
      matchSeq: payload.matchSeq,
      initiatorSlot: payload.initiatorSlot,
      createdAtMs: payload.createdAtMs,
      startedAtMs: nowMs,
      rule: payload.rule,
      rackSeed: payload.rackSeed,
      phase: 'aim',
      stateVersion: 0,
      confirmedStateVersion: 0,
      nextShotSeq: 0,
      provisionalSettledShotIndex: null,
      activeShotIndex: -1,
      inFlightTicks: 0,
      balls: createInitialRack(payload.rule, payload.rackSeed),
      preShotBalls: null,
      groups: [null, null],
      currentPlayer: payload.startingPlayer,
      canMoveCueBall: false,
      isBreakShot: true,
      turnDeadlineMs,
      returnedIds: [],
      scores,
      scoredMatchId: null,
      winner: null,
      shots: [],
      lastShotSnap: null,
      shotFirstHit: null,
      shotPocketed: [],
      shotWasOnEight: false,
      cueScratched: false,
      retiredMatchIds: retired,
    },
  };
}

export function validateRemoteAim(
  state: BilliardsProtocolState,
  payload: AimSyncPayload,
  localPlayerSlot: PlayerSlot,
  verifiedSenderSlot?: PlayerSlot,
): boolean {
  if (!state.hasAuthoritativeMatch || state.phase !== 'aim') return false;
  if (payload.matchId !== state.matchId) return false;
  if (payload.stateVersion !== state.stateVersion) return false;
  if (!validateParticipantSlot(payload.playerSlot, localPlayerSlot, verifiedSenderSlot)) {
    return false;
  }
  return payload.playerSlot === state.currentPlayer;
}

export function validateRemotePlaceCue(
  state: BilliardsProtocolState,
  payload: PlaceCuePayload,
  localPlayerSlot: PlayerSlot,
  verifiedSenderSlot?: PlayerSlot,
): boolean {
  if (!state.hasAuthoritativeMatch || state.phase !== 'aim' || !state.canMoveCueBall) {
    return false;
  }
  if (payload.matchId !== state.matchId) return false;
  if (payload.stateVersion !== state.stateVersion) return false;
  if (!validateParticipantSlot(payload.playerSlot, localPlayerSlot, verifiedSenderSlot)) {
    return false;
  }
  if (payload.playerSlot !== state.currentPlayer) return false;
  return isPositionValidForCue(state.balls, payload.x, payload.y);
}

export type LocalShotCreation =
  | { ok: true; shot: ShotParams }
  | { ok: false; reason: string };

export function createLocalShot(
  state: BilliardsProtocolState,
  params: {
    angle: number;
    power: number;
    spinX: number;
    spinY: number;
    localPlayerSlot: PlayerSlot;
    mode: BilliardsPlayMode;
  },
): LocalShotCreation {
  if (state.phase !== 'aim') {
    return { ok: false, reason: 'not_in_aim_phase' };
  }
  if (params.mode === 'online') {
    if (!state.hasAuthoritativeMatch) {
      return { ok: false, reason: 'match_not_ready' };
    }
    if (state.currentPlayer !== params.localPlayerSlot) {
      return { ok: false, reason: 'not_local_turn' };
    }
  }
  if (!Number.isFinite(params.angle) || !Number.isFinite(params.power) || params.power < 0.04) {
    return { ok: false, reason: 'insufficient_power' };
  }
  const cue = state.balls.find((b) => b.id === 0);
  if (!cue || cue.pocketed) {
    return { ok: false, reason: 'missing_cue_ball' };
  }
  const cuePosOk = state.canMoveCueBall
    ? isPositionValidForCue(state.balls, cue.x, cue.y)
    : isCueWithinTableBounds(cue.x, cue.y);
  if (!cuePosOk) {
    return { ok: false, reason: 'invalid_cue_position' };
  }

  const clampedPower = Math.max(0.04, Math.min(1, params.power));
  const clampedSpinX = Math.max(-0.85, Math.min(0.85, params.spinX));
  const clampedSpinY = Math.max(-0.85, Math.min(0.85, params.spinY));

  return {
    ok: true,
    shot: {
      matchId: state.matchId,
      shotIndex: state.nextShotSeq,
      baseStateVersion: state.stateVersion,
      stateVersion: state.stateVersion + 1,
      playerSlot: state.currentPlayer,
      angle: params.angle,
      power: clampedPower,
      spinX: clampedSpinX,
      spinY: clampedSpinY,
      elevationDeg: 0,
      cueX: cue.x,
      cueY: cue.y,
    },
  };
}

export type RemoteShotValidation =
  | { ok: true }
  | { ok: false; reason: string; shouldRequestSnapshot: boolean };

export function validateRemoteShot(
  state: BilliardsProtocolState,
  shot: ShotParams,
  localPlayerSlot: PlayerSlot,
  verifiedSenderSlot?: PlayerSlot,
): RemoteShotValidation {
  if (!state.hasAuthoritativeMatch) {
    return { ok: false, reason: 'no_authoritative_match', shouldRequestSnapshot: true };
  }
  if (state.retiredMatchIds.includes(shot.matchId)) {
    return { ok: false, reason: 'retired_match', shouldRequestSnapshot: false };
  }
  if (shot.matchId !== state.matchId) {
    return { ok: false, reason: 'match_mismatch', shouldRequestSnapshot: false };
  }
  if (!validateParticipantSlot(shot.playerSlot, localPlayerSlot, verifiedSenderSlot)) {
    return { ok: false, reason: 'invalid_sender', shouldRequestSnapshot: false };
  }
  if (state.shots.some((s) => s.shotIndex === shot.shotIndex)) {
    return { ok: false, reason: 'duplicate_shot_index', shouldRequestSnapshot: false };
  }
  if (shot.shotIndex < state.nextShotSeq || shot.stateVersion <= state.stateVersion) {
    return { ok: false, reason: 'stale_shot', shouldRequestSnapshot: false };
  }
  if (state.phase !== 'aim') {
    return {
      ok: false,
      reason: 'invalid_phase',
      shouldRequestSnapshot: shot.stateVersion > state.stateVersion,
    };
  }
  if (shot.playerSlot !== state.currentPlayer) {
    return { ok: false, reason: 'out_of_turn', shouldRequestSnapshot: false };
  }
  if (
    shot.shotIndex !== state.nextShotSeq ||
    shot.baseStateVersion !== state.stateVersion ||
    shot.stateVersion !== state.stateVersion + 1
  ) {
    return {
      ok: false,
      reason: 'sequence_gap',
      shouldRequestSnapshot: shot.shotIndex > state.nextShotSeq || shot.stateVersion > state.stateVersion + 1,
    };
  }

  const cue = state.balls.find((b) => b.id === 0);
  if (!cue || cue.pocketed) {
    return { ok: false, reason: 'missing_cue_ball', shouldRequestSnapshot: true };
  }
  if (state.canMoveCueBall) {
    if (!isPositionValidForCue(state.balls, shot.cueX, shot.cueY)) {
      return { ok: false, reason: 'invalid_cue_position', shouldRequestSnapshot: false };
    }
  } else {
    if (!isCueWithinTableBounds(shot.cueX, shot.cueY)) {
      return { ok: false, reason: 'invalid_cue_position', shouldRequestSnapshot: false };
    }
    const delta = Math.hypot(shot.cueX - cue.x, shot.cueY - cue.y);
    if (delta > CUE_POSITION_TOLERANCE_PX) {
      return { ok: false, reason: 'cue_position_mismatch', shouldRequestSnapshot: false };
    }
  }
  return { ok: true };
}

function insertShotSorted(shots: readonly ShotParams[], shot: ShotParams): ShotParams[] {
  if (shots.some((s) => s.shotIndex === shot.shotIndex)) {
    return shots.map((s) => ({ ...s }));
  }
  const next = [...shots.map((s) => ({ ...s })), { ...shot }];
  next.sort((a, b) => a.shotIndex - b.shotIndex);
  return next;
}

export function beginShotOnState(
  state: BilliardsProtocolState,
  shot: ShotParams,
): BilliardsProtocolState {
  const nextBalls = cloneBalls(state.balls);
  const cue = nextBalls.find((b) => b.id === 0);
  if (cue && !cue.pocketed) {
    cue.x = shot.cueX;
    cue.y = shot.cueY;
  }
  const preShotBalls = cloneBalls(nextBalls);
  const nextShots = insertShotSorted(state.shots, shot);

  return {
    ...state,
    phase: 'moving',
    balls: nextBalls,
    preShotBalls,
    lastShotSnap: { balls: cloneBalls(preShotBalls), shot: { ...shot } },
    shots: nextShots,
    activeShotIndex: shot.shotIndex,
    nextShotSeq: Math.max(state.nextShotSeq, shot.shotIndex + 1),
    stateVersion: shot.stateVersion,
    confirmedStateVersion: shot.stateVersion,
    provisionalSettledShotIndex: null,
    inFlightTicks: 0,
    canMoveCueBall: false,
    shotFirstHit: null,
    shotPocketed: [],
    cueScratched: false,
    shotWasOnEight: canShootEight(nextBalls, state.groups[state.currentPlayer]),
  };
}

export type RemoteSettledResult =
  | {
      accepted: true;
      nextState: BilliardsProtocolState;
      alreadyProvisionallySettled: boolean;
      shouldRequestSnapshot: boolean;
    }
  | {
      accepted: false;
      reason: string;
      shouldRequestSnapshot: boolean;
    };

export function applyRemoteSettled(
  state: BilliardsProtocolState,
  settled: SettledStatePayload,
  localPlayerSlot: PlayerSlot,
  nowMs: number,
  verifiedSenderSlot?: PlayerSlot,
): RemoteSettledResult {
  if (!state.hasAuthoritativeMatch) {
    return { accepted: false, reason: 'no_authoritative_match', shouldRequestSnapshot: true };
  }
  if (state.retiredMatchIds.includes(settled.matchId)) {
    return { accepted: false, reason: 'retired_match', shouldRequestSnapshot: false };
  }
  if (settled.matchId !== state.matchId || settled.matchSeq !== state.matchSeq) {
    return {
      accepted: false,
      reason: 'match_mismatch',
      shouldRequestSnapshot: settled.matchSeq > state.matchSeq,
    };
  }
  if (!validateParticipantSlot(settled.actorSlot, localPlayerSlot, verifiedSenderSlot)) {
    return { accepted: false, reason: 'invalid_sender', shouldRequestSnapshot: false };
  }
  if (!areBallsValidForRule(settled.balls, state.rule) || hasMovingBalls(settled.balls)) {
    return { accepted: false, reason: 'invalid_or_moving_settled_balls', shouldRequestSnapshot: false };
  }
  if (
    settled.stateVersion <= state.confirmedStateVersion ||
    settled.stateVersion < state.stateVersion ||
    settled.nextShotSeq < state.nextShotSeq
  ) {
    return { accepted: false, reason: 'stale_or_duplicate_settled', shouldRequestSnapshot: false };
  }

  if (settled.kind === 'shot_settled') {
    if (settled.shotIndex === null) {
      return { accepted: false, reason: 'missing_shot_index', shouldRequestSnapshot: false };
    }
    if (
      state.phase === 'moving' &&
      state.activeShotIndex === settled.shotIndex &&
      settled.actorSlot !== state.currentPlayer
    ) {
      return { accepted: false, reason: 'settled_wrong_shooter', shouldRequestSnapshot: false };
    }
    if (settled.shot) {
      if (
        settled.shot.matchId !== settled.matchId ||
        settled.shot.shotIndex !== settled.shotIndex ||
        settled.shot.playerSlot !== settled.actorSlot
      ) {
        return { accepted: false, reason: 'settled_shot_mismatch', shouldRequestSnapshot: false };
      }
    }
  } else {
    if (settled.shotIndex !== null || !settled.ballInHand) {
      return { accepted: false, reason: 'invalid_timeout_payload', shouldRequestSnapshot: false };
    }
    if (settled.stateVersion === state.stateVersion + 1) {
      if (state.phase !== 'aim' || settled.nextPlayer === state.currentPlayer) {
        return { accepted: false, reason: 'invalid_timeout_transition', shouldRequestSnapshot: false };
      }
    }
  }

  const alreadyProvisionallySettled =
    settled.kind === 'shot_settled' &&
    state.provisionalSettledShotIndex !== null &&
    state.provisionalSettledShotIndex === settled.shotIndex &&
    state.stateVersion === settled.stateVersion;

  let nextShots = state.shots.map((s) => ({ ...s }));
  let nextLastShotSnap = state.lastShotSnap
    ? { balls: cloneBalls(state.lastShotSnap.balls), shot: { ...state.lastShotSnap.shot } }
    : null;

  if (settled.kind === 'shot_settled' && settled.shot) {
    const hadShot = nextShots.some((s) => s.shotIndex === settled.shot!.shotIndex);
    if (!hadShot) {
      if (state.phase === 'aim' && state.stateVersion === settled.shot.baseStateVersion) {
        nextLastShotSnap = {
          balls: cloneBalls(state.balls),
          shot: { ...settled.shot },
        };
      }
      nextShots = insertShotSorted(nextShots, settled.shot);
    }
  }

  const shouldRequestSnapshot =
    settled.nextShotSeq > nextShots.length &&
    settled.nextShotSeq > state.nextShotSeq + 1;

  const turnDeadlineMs = resolveTurnDeadlineMs(
    settled.turnDeadlineMs,
    settled.turnRemainingMs,
    nowMs,
  );
  const nextWinner = settled.winner ? { ...settled.winner } : null;

  return {
    accepted: true,
    alreadyProvisionallySettled,
    shouldRequestSnapshot,
    nextState: {
      ...state,
      phase: nextWinner ? 'gameOver' : 'aim',
      stateVersion: settled.stateVersion,
      confirmedStateVersion: settled.stateVersion,
      nextShotSeq: Math.max(state.nextShotSeq, settled.nextShotSeq),
      provisionalSettledShotIndex: null,
      activeShotIndex: -1,
      inFlightTicks: 0,
      balls: cloneBalls(settled.balls),
      preShotBalls: null,
      groups: [settled.groups[0], settled.groups[1]],
      currentPlayer: settled.nextPlayer,
      canMoveCueBall: settled.ballInHand,
      isBreakShot: settled.isBreakShot,
      turnDeadlineMs,
      returnedIds: [...settled.returnedIds],
      scores: [settled.scores[0], settled.scores[1]],
      scoredMatchId: nextWinner ? settled.matchId : state.scoredMatchId,
      winner: nextWinner,
      shots: nextShots,
      lastShotSnap: nextLastShotSnap,
      shotFirstHit: null,
      shotPocketed: [],
      shotWasOnEight: false,
      cueScratched: false,
    },
  };
}

export type RemoteSnapshotResult =
  | { accepted: true; nextState: BilliardsProtocolState }
  | { accepted: false; reason: string };

export function applyRemoteSnapshot(
  state: BilliardsProtocolState,
  snap: MatchSnapshot,
  localPlayerSlot: PlayerSlot,
  nowMs: number,
  verifiedSenderSlot?: PlayerSlot,
): RemoteSnapshotResult {
  if (!validateParticipantSlot(snap.senderSlot, localPlayerSlot, verifiedSenderSlot)) {
    return { accepted: false, reason: 'invalid_sender' };
  }
  if (state.retiredMatchIds.includes(snap.matchId)) {
    return { accepted: false, reason: 'retired_match' };
  }
  if (!areBallsValidForRule(snap.balls, snap.rule)) {
    return { accepted: false, reason: 'invalid_balls' };
  }

  const ballsMoving = hasMovingBalls(snap.balls);
  if (snap.phase === 'moving') {
    if (
      !snap.inFlightShot ||
      snap.inFlightShot.shot.matchId !== snap.matchId ||
      !areBallsValidForRule(snap.inFlightShot.preShotBalls, snap.rule)
    ) {
      return { accepted: false, reason: 'invalid_in_flight_snapshot' };
    }
  } else if (ballsMoving) {
    // Never treat a moving-ball snapshot as a settled aiming or gameOver state
    return { accepted: false, reason: 'moving_balls_in_settled_snapshot' };
  }

  const canonicalShotSeq = Math.max(snap.nextShotSeq, snap.shotCount);

  if (state.hasAuthoritativeMatch) {
    const cmp = compareMatchOrder(snap, state);
    if (cmp < 0) {
      const canRecoverActiveOverUntouchedFallback =
        snap.matchSeq === state.matchSeq &&
        state.stateVersion === 0 &&
        state.shots.length === 0 &&
        snap.stateVersion > 0;
      if (!canRecoverActiveOverUntouchedFallback) {
        return { accepted: false, reason: 'stale_match_snapshot' };
      }
    }
    if (cmp === 0) {
      if (snap.stateVersion < state.stateVersion || canonicalShotSeq < state.nextShotSeq) {
        return { accepted: false, reason: 'stale_version_snapshot' };
      }
      if (snap.stateVersion === state.stateVersion && state.confirmedStateVersion >= snap.stateVersion) {
        if (snap.phase === 'moving' && state.phase === 'moving' && snap.inFlightShot) {
          if (snap.inFlightShot.ticksElapsed <= state.inFlightTicks) {
            return { accepted: false, reason: 'duplicate_in_flight_snapshot' };
          }
        } else {
          return { accepted: false, reason: 'duplicate_snapshot' };
        }
      }
    }
  }

  const retired =
    state.hasAuthoritativeMatch && state.matchId !== snap.matchId
      ? retireMatchId(state.retiredMatchIds, state.matchId)
      : [...state.retiredMatchIds];

  let nextShots = snap.shots.map((s) => ({ ...s }));
  let nextLastShotSnap = snap.lastShotSnap
    ? { balls: cloneBalls(snap.lastShotSnap.balls), shot: { ...snap.lastShotSnap.shot } }
    : null;

  if (snap.phase === 'moving' && snap.inFlightShot) {
    if (!nextShots.some((s) => s.shotIndex === snap.inFlightShot!.shot.shotIndex)) {
      nextShots = insertShotSorted(nextShots, snap.inFlightShot.shot);
    }
    if (!nextLastShotSnap) {
      nextLastShotSnap = {
        balls: cloneBalls(snap.inFlightShot.preShotBalls),
        shot: { ...snap.inFlightShot.shot },
      };
    }
  }

  const turnDeadlineMs = resolveTurnDeadlineMs(
    snap.turnDeadlineMs,
    snap.turnRemainingMs,
    nowMs,
  );
  const nextWinner = snap.winner ? { ...snap.winner } : null;

  return {
    accepted: true,
    nextState: {
      hasAuthoritativeMatch: true,
      matchId: snap.matchId,
      matchSeq: snap.matchSeq,
      initiatorSlot: snap.initiatorSlot,
      createdAtMs: snap.createdAtMs,
      startedAtMs: snap.startedAtMs,
      rule: snap.rule,
      rackSeed: snap.rackSeed,
      phase: snap.phase,
      stateVersion: snap.stateVersion,
      confirmedStateVersion: snap.stateVersion,
      nextShotSeq: canonicalShotSeq,
      provisionalSettledShotIndex: null,
      activeShotIndex:
        snap.phase === 'moving' && snap.inFlightShot ? snap.inFlightShot.shot.shotIndex : -1,
      inFlightTicks:
        snap.phase === 'moving' && snap.inFlightShot ? snap.inFlightShot.ticksElapsed : 0,
      balls: cloneBalls(snap.balls),
      preShotBalls:
        snap.phase === 'moving' && snap.inFlightShot
          ? cloneBalls(snap.inFlightShot.preShotBalls)
          : null,
      groups: [snap.groups[0], snap.groups[1]],
      currentPlayer: snap.currentPlayer,
      canMoveCueBall: snap.ballInHand,
      isBreakShot: snap.isBreakShot,
      turnDeadlineMs,
      returnedIds: [...snap.returnedIds],
      scores: [snap.scores[0], snap.scores[1]],
      scoredMatchId: nextWinner ? snap.matchId : null,
      winner: nextWinner,
      shots: nextShots,
      lastShotSnap: nextLastShotSnap,
      shotFirstHit:
        snap.phase === 'moving' && snap.inFlightShot ? snap.inFlightShot.shotFirstHit : null,
      shotPocketed:
        snap.phase === 'moving' && snap.inFlightShot ? [...snap.inFlightShot.shotPocketed] : [],
      shotWasOnEight:
        snap.phase === 'moving' && snap.inFlightShot ? snap.inFlightShot.shotWasOnEight : false,
      cueScratched:
        snap.phase === 'moving' && snap.inFlightShot ? snap.inFlightShot.cueScratched : false,
      retiredMatchIds: retired,
    },
  };
}

export function buildMatchSnapshot(
  state: BilliardsProtocolState,
  senderSlot: PlayerSlot,
  nowMs: number,
  overrideBalls?: readonly BallState[] | null,
  overridePhase?: BilliardsMatchPhase,
): MatchSnapshot {
  const phase = overridePhase ?? state.phase;
  const balls = cloneBalls(overrideBalls ?? state.balls);
  const activeShot =
    phase === 'moving'
      ? state.shots.find((s) => s.shotIndex === state.activeShotIndex) ??
        state.lastShotSnap?.shot ??
        null
      : null;

  const inFlightShot =
    phase === 'moving' && activeShot && state.preShotBalls
      ? {
          shot: { ...activeShot },
          preShotBalls: cloneBalls(state.preShotBalls),
          shotFirstHit: state.shotFirstHit,
          shotPocketed: [...state.shotPocketed],
          shotWasOnEight: state.shotWasOnEight,
          cueScratched: state.cueScratched,
          ticksElapsed: state.inFlightTicks,
        }
      : null;

  return {
    matchId: state.matchId,
    matchSeq: Math.max(1, state.matchSeq),
    initiatorSlot: state.initiatorSlot,
    senderSlot,
    createdAtMs: state.createdAtMs,
    startedAtMs: state.startedAtMs,
    rule: state.rule,
    rackSeed: state.rackSeed,
    phase,
    stateVersion: state.stateVersion,
    nextShotSeq: state.nextShotSeq,
    shotCount: state.nextShotSeq,
    balls,
    groups: [state.groups[0], state.groups[1]],
    currentPlayer: state.currentPlayer,
    ballInHand: state.canMoveCueBall,
    isBreakShot: state.isBreakShot,
    turnDeadlineMs: state.turnDeadlineMs,
    turnRemainingMs: Math.max(0, state.turnDeadlineMs - nowMs),
    shots: state.shots.map((s) => ({ ...s })),
    lastShotSnap: state.lastShotSnap
      ? { balls: cloneBalls(state.lastShotSnap.balls), shot: { ...state.lastShotSnap.shot } }
      : null,
    inFlightShot,
    returnedIds: [...state.returnedIds],
    scores: [state.scores[0], state.scores[1]],
    winner: state.winner ? { ...state.winner } : null,
  };
}

export function shouldAnswerStateRequest(
  state: BilliardsProtocolState,
  requester: StateRequestPayload,
): { respond: boolean; shouldRequestPeer: boolean } {
  if (!state.hasAuthoritativeMatch) {
    return { respond: false, shouldRequestPeer: false };
  }
  const reqSeq = requester.currentMatchSeq ?? 0;
  const reqVer = requester.currentStateVersion ?? 0;
  if (reqSeq > state.matchSeq) {
    return { respond: false, shouldRequestPeer: true };
  }
  if (
    reqSeq === state.matchSeq &&
    requester.currentMatchId === state.matchId &&
    reqVer > state.stateVersion
  ) {
    return { respond: false, shouldRequestPeer: true };
  }
  return { respond: true, shouldRequestPeer: false };
}
