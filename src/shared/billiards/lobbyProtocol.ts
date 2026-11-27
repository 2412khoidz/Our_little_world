import type {
  BilliardsEdition,
  BilliardsLobbyState,
  BilliardsRule,
  LobbyConfigPayload,
  LobbyConfirmedConfig,
  LobbyJoinPayload,
  LobbyLeavePayload,
  LobbyPlayerState,
  LobbyReadyPayload,
  LobbyRematchPayload,
  PlayerSlot,
  ScoresTuple,
} from './types';

export const LOBBY_COUNTDOWN_MS = 2_500;

function makeEmptyPlayer(): LobbyPlayerState {
  return {
    joined: false,
    connected: false,
    ready: false,
    assetsReady: false,
    wantRematch: false,
  };
}

function cloneLobby(state: BilliardsLobbyState, nowMs: number): BilliardsLobbyState {
  return {
    ...state,
    players: [{ ...state.players[0] }, { ...state.players[1] }],
    confirmedConfig: state.confirmedConfig
      ? {
          ...state.confirmedConfig,
          scores: [state.confirmedConfig.scores[0], state.confirmedConfig.scores[1]],
        }
      : null,
    serverNowMs: nowMs,
  };
}

export function createInitialLobbyState(
  lobbyId: string,
  nowMs: number,
  defaults?: {
    edition?: BilliardsEdition;
    rule?: BilliardsRule;
    startingPlayer?: PlayerSlot;
  },
): BilliardsLobbyState {
  return {
    lobbyId,
    configVersion: 1,
    status: 'idle',
    edition: defaults?.edition ?? '2d',
    rule: defaults?.rule ?? '8ball',
    startingPlayer: defaults?.startingPlayer ?? 0,
    players: [makeEmptyPlayer(), makeEmptyPlayer()],
    confirmedConfig: null,
    activeMatchId: null,
    serverNowMs: nowMs,
  };
}

export function canStartSynchronizedCountdown(state: BilliardsLobbyState): boolean {
  if (state.status !== 'lobby') return false;
  const p0 = state.players[0];
  const p1 = state.players[1];
  return (
    p0.joined &&
    p0.connected &&
    p0.ready &&
    p0.assetsReady &&
    p1.joined &&
    p1.connected &&
    p1.ready &&
    p1.assetsReady
  );
}

export interface NextLobbyMatchMeta {
  matchId: string;
  matchSeq: number;
  rackSeed: number;
  scores: ScoresTuple;
}

function buildConfirmedConfig(
  state: BilliardsLobbyState,
  startingPlayer: PlayerSlot,
  nowMs: number,
  meta: NextLobbyMatchMeta,
): LobbyConfirmedConfig {
  return {
    matchId: meta.matchId,
    matchSeq: Math.max(1, meta.matchSeq),
    edition: state.edition,
    rule: state.rule,
    rackSeed: meta.rackSeed,
    startingPlayer,
    startAtServerMs: nowMs + LOBBY_COUNTDOWN_MS,
    countdownMs: LOBBY_COUNTDOWN_MS,
    serverConfirmedAtMs: nowMs,
    scores: [meta.scores[0], meta.scores[1]],
  };
}

export function applyLobbyJoin(
  state: BilliardsLobbyState,
  payload: LobbyJoinPayload & { connected?: boolean },
  nowMs: number,
): BilliardsLobbyState {
  const next = cloneLobby(state, nowMs);
  const slot = payload.playerSlot;
  const wasIdle = next.status === 'idle';
  next.players[slot].joined = true;
  next.players[slot].connected = payload.connected ?? true;
  if (payload.assetsReady !== undefined) {
    next.players[slot].assetsReady = payload.assetsReady;
  }

  // Only adopt initial preferences if lobby was completely idle and no one else was joined yet
  const other = next.players[slot === 0 ? 1 : 0];
  if (wasIdle && !other.joined) {
    if (payload.edition) next.edition = payload.edition;
    if (payload.rule) next.rule = payload.rule;
    if (payload.startingPlayer !== undefined) next.startingPlayer = payload.startingPlayer;
  }

  if (next.status === 'idle') {
    next.status = 'lobby';
  }
  return next;
}

export type LobbyConfigResult =
  | { accepted: true; nextState: BilliardsLobbyState }
  | { accepted: false; reason: 'in_match' | 'stale_config_version' | 'not_joined' };

export function applyLobbyConfig(
  state: BilliardsLobbyState,
  payload: LobbyConfigPayload,
  nowMs: number,
): LobbyConfigResult {
  if (state.status === 'in_match') {
    return { accepted: false, reason: 'in_match' };
  }
  if (!state.players[payload.actorSlot].joined) {
    return { accepted: false, reason: 'not_joined' };
  }
  if (payload.configVersion < state.configVersion) {
    return { accepted: false, reason: 'stale_config_version' };
  }

  const next = cloneLobby(state, nowMs);
  const editionChanged = next.edition !== payload.edition;
  next.configVersion += 1;
  next.edition = payload.edition;
  next.rule = payload.rule;
  next.startingPlayer = payload.startingPlayer;
  next.status = 'lobby';
  next.confirmedConfig = null;
  for (const p of next.players) {
    p.ready = false;
    p.wantRematch = false;
    if (editionChanged) {
      p.assetsReady = false;
    }
  }
  return { accepted: true, nextState: next };
}

export type LobbyReadyResult =
  | { accepted: true; nextState: BilliardsLobbyState; startedCountdown: boolean }
  | { accepted: false; reason: 'in_match' | 'stale_config_version' | 'not_joined' | 'assets_not_ready' };

export function applyLobbyReady(
  state: BilliardsLobbyState,
  payload: LobbyReadyPayload,
  nowMs: number,
  nextMatchMeta: NextLobbyMatchMeta,
): LobbyReadyResult {
  if (state.status === 'in_match') {
    return { accepted: false, reason: 'in_match' };
  }
  if (!state.players[payload.playerSlot].joined) {
    return { accepted: false, reason: 'not_joined' };
  }
  if (payload.configVersion !== state.configVersion) {
    return { accepted: false, reason: 'stale_config_version' };
  }
  if (payload.ready && !payload.assetsReady) {
    return { accepted: false, reason: 'assets_not_ready' };
  }

  const next = cloneLobby(state, nowMs);
  const player = next.players[payload.playerSlot];
  player.assetsReady = payload.assetsReady;
  player.ready = payload.ready && payload.assetsReady;
  player.connected = true;

  if (!player.ready && next.status === 'countdown') {
    next.status = 'lobby';
    next.confirmedConfig = null;
    return { accepted: true, nextState: next, startedCountdown: false };
  }

  if (canStartSynchronizedCountdown(next)) {
    next.status = 'countdown';
    next.confirmedConfig = buildConfirmedConfig(next, next.startingPlayer, nowMs, nextMatchMeta);
    next.activeMatchId = next.confirmedConfig.matchId;
    return { accepted: true, nextState: next, startedCountdown: true };
  }

  return { accepted: true, nextState: next, startedCountdown: false };
}

export function promoteCountdownToMatch(
  state: BilliardsLobbyState,
  nowMs: number,
): BilliardsLobbyState {
  if (state.status !== 'countdown' || !state.confirmedConfig) return cloneLobby(state, nowMs);
  const next = cloneLobby(state, nowMs);
  next.status = 'in_match';
  next.activeMatchId = state.confirmedConfig.matchId;
  for (const p of next.players) {
    p.wantRematch = false;
  }
  return next;
}

export function applyLobbyLeave(
  state: BilliardsLobbyState,
  payload: LobbyLeavePayload,
  nowMs: number,
): BilliardsLobbyState {
  const next = cloneLobby(state, nowMs);
  const slot = payload.playerSlot;
  if (payload.reason === 'cancel') {
    next.players[slot].ready = false;
    next.players[slot].wantRematch = false;
    if (next.status === 'countdown') {
      next.status = 'lobby';
      next.confirmedConfig = null;
      next.activeMatchId = null;
    }
    return next;
  }

  if (payload.reason === 'new_lobby') {
    next.status = 'lobby';
    next.confirmedConfig = null;
    next.activeMatchId = null;
    next.players[slot].joined = true;
    next.players[slot].connected = true;
    for (const p of next.players) {
      p.ready = false;
      p.wantRematch = false;
    }
    return next;
  }

  next.players[slot].joined = false;
  next.players[slot].ready = false;
  next.players[slot].wantRematch = false;

  if (next.status === 'countdown') {
    next.status = 'lobby';
    next.confirmedConfig = null;
    next.activeMatchId = null;
  }

  const anyJoined = next.players[0].joined || next.players[1].joined;
  if (!anyJoined) {
    next.status = 'idle';
    next.confirmedConfig = null;
    next.activeMatchId = null;
  }
  return next;
}

export function applyLobbyConnectionChange(
  state: BilliardsLobbyState,
  playerSlot: PlayerSlot,
  connected: boolean,
  nowMs: number,
): BilliardsLobbyState {
  const next = cloneLobby(state, nowMs);
  next.players[playerSlot].connected = connected;

  if (!connected) {
    // During pre-start countdown, dropping connection cancels start and resets readiness.
    if (next.status === 'countdown') {
      next.status = 'lobby';
      next.confirmedConfig = null;
      next.activeMatchId = null;
      next.players[playerSlot].ready = false;
    } else if (next.status === 'lobby') {
      next.players[playerSlot].ready = false;
    }
    // IMPORTANT: When status === 'in_match', DO NOT reset status or activeMatchId!
    // Disconnected players reconnect and recover the exact existing match.
  }

  return next;
}

export function markLobbyMatchEnded(
  state: BilliardsLobbyState,
  matchId: string,
  scores: ScoresTuple,
  nowMs: number,
): BilliardsLobbyState {
  const next = cloneLobby(state, nowMs);
  if (next.confirmedConfig && next.confirmedConfig.matchId === matchId) {
    next.confirmedConfig.scores = [scores[0], scores[1]];
  }
  return next;
}

export function applyLobbyRematch(
  state: BilliardsLobbyState,
  payload: LobbyRematchPayload,
  nowMs: number,
  nextStartingPlayer?: PlayerSlot,
  nextMatchMeta?: NextLobbyMatchMeta,
): { accepted: boolean; nextState: BilliardsLobbyState; startedCountdown: boolean } {
  const next = cloneLobby(state, nowMs);
  if (next.activeMatchId !== payload.matchId && next.confirmedConfig?.matchId !== payload.matchId) {
    return { accepted: false, nextState: next, startedCountdown: false };
  }
  next.players[payload.playerSlot].wantRematch = payload.wantRematch;
  next.players[payload.playerSlot].joined = true;
  next.players[payload.playerSlot].connected = true;

  const p0 = next.players[0];
  const p1 = next.players[1];
  if (
    p0.connected &&
    p1.connected &&
    p0.wantRematch &&
    p1.wantRematch &&
    p0.assetsReady &&
    p1.assetsReady
  ) {
    const resolvedNextStarter: PlayerSlot =
      nextStartingPlayer ?? ((state.confirmedConfig?.startingPlayer ?? state.startingPlayer) === 0 ? 1 : 0);
    const meta: NextLobbyMatchMeta = nextMatchMeta ?? {
      matchId: `m-${nowMs}`,
      matchSeq: (state.confirmedConfig?.matchSeq ?? 0) + 1,
      rackSeed: (state.confirmedConfig?.rackSeed ?? 0) + 1,
      scores: state.confirmedConfig?.scores ?? [0, 0],
    };
    next.startingPlayer = resolvedNextStarter;
    next.status = 'countdown';
    next.confirmedConfig = buildConfirmedConfig(next, resolvedNextStarter, nowMs, meta);
    next.activeMatchId = next.confirmedConfig.matchId;
    p0.wantRematch = false;
    p1.wantRematch = false;
    p0.ready = true;
    p1.ready = true;
    return { accepted: true, nextState: next, startedCountdown: true };
  }

  return { accepted: true, nextState: next, startedCountdown: false };
}

export function computeCountdownRemainingMs(
  startAtServerMs: number,
  localNowMs: number,
  serverClockOffsetMs = 0,
): number {
  const estimatedServerNow = localNowMs + serverClockOffsetMs;
  return Math.max(0, startAtServerMs - estimatedServerNow);
}
