import { describe, expect, it } from 'vitest';
import {
  LOBBY_COUNTDOWN_MS,
  applyLobbyConfig,
  applyLobbyConnectionChange,
  applyLobbyJoin,
  applyLobbyLeave,
  applyLobbyReady,
  applyLobbyRematch,
  computeCountdownRemainingMs,
  createInitialLobbyState,
  promoteCountdownToMatch,
} from '../../src/shared/billiards/lobbyProtocol';

describe('Billiards Online Lobby & Ready Check protocol', () => {
  it('starts synchronized countdown only when both players are joined, connected, asset-loaded, and ready', () => {
    const t0 = 1_700_000_000_000;
    let state = createInitialLobbyState('lobby-1', t0);
    state = applyLobbyJoin(state, { playerSlot: 0, edition: '3d', rule: '8ball', assetsReady: false }, t0 + 10);
    state = applyLobbyJoin(state, { playerSlot: 1, assetsReady: true }, t0 + 20);
    expect(state.status).toBe('lobby');
    expect(state.edition).toBe('3d');

    // Slot 0 cannot ready before assetsReady === true
    const blockedReady = applyLobbyReady(
      state,
      { playerSlot: 0, configVersion: state.configVersion, ready: true, assetsReady: false },
      t0 + 30,
      { matchId: 'm1', matchSeq: 1, rackSeed: 42, scores: [0, 0] },
    );
    expect(blockedReady.accepted).toBe(false);

    // Slot 1 readies first -> still waiting on slot 0
    const p1Ready = applyLobbyReady(
      state,
      { playerSlot: 1, configVersion: state.configVersion, ready: true, assetsReady: true },
      t0 + 40,
      { matchId: 'm1', matchSeq: 1, rackSeed: 42, scores: [0, 0] },
    );
    expect(p1Ready.accepted).toBe(true);
    if (!p1Ready.accepted) return;
    expect(p1Ready.startedCountdown).toBe(false);
    state = p1Ready.nextState;

    // Config change invalidates ready flags & forces asset re-check on edition change
    const cfgRes = applyLobbyConfig(
      state,
      { actorSlot: 0, configVersion: state.configVersion, edition: '2d', rule: '9ball', startingPlayer: 1 },
      t0 + 50,
    );
    expect(cfgRes.accepted).toBe(true);
    if (!cfgRes.accepted) return;
    state = cfgRes.nextState;
    expect(state.configVersion).toBe(2);
    expect(state.players[0].ready).toBe(false);
    expect(state.players[1].ready).toBe(false);
    expect(state.players[1].assetsReady).toBe(false);

    // Stale ready packet with old configVersion=1 must be rejected
    const staleReady = applyLobbyReady(
      state,
      { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
      t0 + 55,
      { matchId: 'm1', matchSeq: 1, rackSeed: 42, scores: [0, 0] },
    );
    expect(staleReady.accepted).toBe(false);

    // Both load 2D assets and ready -> authoritative countdown starts!
    const r0 = applyLobbyReady(
      state,
      { playerSlot: 0, configVersion: 2, ready: true, assetsReady: true },
      t0 + 60,
      { matchId: 'm1', matchSeq: 1, rackSeed: 42, scores: [0, 0] },
    );
    expect(r0.accepted && !r0.startedCountdown).toBe(true);
    if (!r0.accepted) return;
    state = r0.nextState;

    const r1 = applyLobbyReady(
      state,
      { playerSlot: 1, configVersion: 2, ready: true, assetsReady: true },
      t0 + 70,
      { matchId: 'm1', matchSeq: 1, rackSeed: 42, scores: [0, 0] },
    );
    expect(r1.accepted && r1.startedCountdown).toBe(true);
    if (!r1.accepted) return;
    state = r1.nextState;
    expect(state.status).toBe('countdown');
    expect(state.confirmedConfig?.edition).toBe('2d');
    expect(state.confirmedConfig?.rule).toBe('9ball');
    expect(state.confirmedConfig?.startingPlayer).toBe(1);
    expect(state.confirmedConfig?.startAtServerMs).toBe(t0 + 70 + LOBBY_COUNTDOWN_MS);

    // Latency-compensated countdown helper
    expect(computeCountdownRemainingMs(state.confirmedConfig!.startAtServerMs, t0 + 570, 500)).toBe(
      LOBBY_COUNTDOWN_MS - 1000,
    );
  });

  it('cancels countdown on disconnect/leave, but preserves active match on disconnect for reconnect recovery', () => {
    const t0 = 1_700_000_000_000;
    let state = createInitialLobbyState('lobby-2', t0);
    state = applyLobbyJoin(state, { playerSlot: 0, assetsReady: true }, t0);
    state = applyLobbyJoin(state, { playerSlot: 1, assetsReady: true }, t0);
    state = (
      applyLobbyReady(
        state,
        { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
        t0,
        { matchId: 'm-cd', matchSeq: 1, rackSeed: 7, scores: [0, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    state = (
      applyLobbyReady(
        state,
        { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
        t0 + 10,
        { matchId: 'm-cd', matchSeq: 1, rackSeed: 7, scores: [0, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    expect(state.status).toBe('countdown');

    // Cancel during countdown
    state = applyLobbyLeave(state, { playerSlot: 1, reason: 'cancel' }, t0 + 20);
    expect(state.status).toBe('lobby');
    expect(state.confirmedConfig).toBeNull();

    // Re-ready and promote to active match
    state = (
      applyLobbyReady(
        state,
        { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
        t0 + 30,
        { matchId: 'm-active', matchSeq: 2, rackSeed: 88, scores: [1, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    state = promoteCountdownToMatch(state, t0 + 3000);
    expect(state.status).toBe('in_match');
    expect(state.activeMatchId).toBe('m-active');

    // Mid-match disconnect MUST preserve active match
    state = applyLobbyConnectionChange(state, 1, false, t0 + 4000);
    expect(state.status).toBe('in_match');
    expect(state.activeMatchId).toBe('m-active');
    expect(state.players[1].connected).toBe(false);

    // Reconnect and rematch coordination
    state = applyLobbyConnectionChange(state, 1, true, t0 + 5000);
    const rem0 = applyLobbyRematch(
      state,
      { playerSlot: 0, matchId: 'm-active', wantRematch: true },
      t0 + 6000,
      1,
      { matchId: 'm-next', matchSeq: 3, rackSeed: 99, scores: [2, 0] },
    );
    expect(rem0.accepted && !rem0.startedCountdown).toBe(true);
    const rem1 = applyLobbyRematch(
      rem0.nextState,
      { playerSlot: 1, matchId: 'm-active', wantRematch: true },
      t0 + 6100,
      1,
      { matchId: 'm-next', matchSeq: 3, rackSeed: 99, scores: [2, 0] },
    );
    expect(rem1.accepted && rem1.startedCountdown).toBe(true);
    expect(rem1.nextState.confirmedConfig?.matchId).toBe('m-next');
    expect(rem1.nextState.confirmedConfig?.startingPlayer).toBe(1);
  });
});
