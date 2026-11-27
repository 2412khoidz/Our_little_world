import { describe, expect, it } from 'vitest';
import {
  applyLobbyConnectionChange,
  applyLobbyJoin,
  applyLobbyLeave,
  applyLobbyReady,
  applyLobbyRematch,
  createInitialLobbyState,
  markLobbyMatchEnded,
  promoteCountdownToMatch,
} from '../../src/shared/billiards/lobbyProtocol';

describe('Billiards Room & Match Lifecycle Unit Tests', () => {
  const t0 = 1_700_000_000_000;

  it('markLobbyMatchEnded transitions in_match room to lobby, clears activeMatchId, and updates scores', () => {
    let state = createInitialLobbyState('lobby-room-1', t0);
    state = applyLobbyJoin(state, { playerSlot: 0, assetsReady: true }, t0);
    state = applyLobbyJoin(state, { playerSlot: 1, assetsReady: true }, t0);
    state = (
      applyLobbyReady(
        state,
        { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
        t0,
        { matchId: 'm-101', matchSeq: 1, rackSeed: 123, scores: [0, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    state = (
      applyLobbyReady(
        state,
        { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
        t0 + 10,
        { matchId: 'm-101', matchSeq: 1, rackSeed: 123, scores: [0, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    expect(state.status).toBe('countdown');

    state = promoteCountdownToMatch(state, t0 + 2500);
    expect(state.status).toBe('in_match');
    expect(state.activeMatchId).toBe('m-101');

    // End match with winner
    const ended = markLobbyMatchEnded(state, 'm-101', [1, 0], t0 + 5000);
    expect(ended.status).toBe('lobby');
    expect(ended.activeMatchId).toBeNull();
    expect(ended.confirmedConfig?.scores).toEqual([1, 0]);
    expect(ended.players[0].ready).toBe(false);
    expect(ended.players[1].ready).toBe(false);
    expect(ended.players[0].wantRematch).toBe(false);
    expect(ended.players[1].wantRematch).toBe(false);
  });

  it('applyLobbyRematch preserves lobbyId, alternates starting player, and guards against duplicate rematch triggers', () => {
    let state = createInitialLobbyState('lobby-room-stable', t0);
    state = applyLobbyJoin(state, { playerSlot: 0, startingPlayer: 0, assetsReady: true }, t0);
    state = applyLobbyJoin(state, { playerSlot: 1, assetsReady: true }, t0);

    // End match 1
    state = markLobbyMatchEnded(state, 'm-prev', [1, 0], t0 + 1000);
    expect(state.status).toBe('lobby');

    // Player 0 requests rematch
    const rem0 = applyLobbyRematch(
      state,
      { playerSlot: 0, matchId: 'm-prev', wantRematch: true },
      t0 + 2000,
    );
    expect(rem0.accepted).toBe(true);
    expect(rem0.startedCountdown).toBe(false);
    expect(rem0.nextState.players[0].wantRematch).toBe(true);

    // Player 1 requests rematch -> triggers countdown & alternates starter from 0 to 1
    const rem1 = applyLobbyRematch(
      rem0.nextState,
      { playerSlot: 1, matchId: 'm-prev', wantRematch: true },
      t0 + 2100,
      1,
      { matchId: 'm-rematch-2', matchSeq: 2, rackSeed: 456, scores: [1, 0] },
    );
    expect(rem1.accepted).toBe(true);
    expect(rem1.startedCountdown).toBe(true);
    expect(rem1.nextState.status).toBe('countdown');
    expect(rem1.nextState.lobbyId).toBe('lobby-room-stable');
    expect(rem1.nextState.activeMatchId).toBe('m-rematch-2');
    expect(rem1.nextState.confirmedConfig?.startingPlayer).toBe(1);
    expect(rem1.nextState.confirmedConfig?.scores).toEqual([1, 0]);

    // Scenario 5: Concurrent duplicate rematch call while countdown is already active must be ignored
    const dupRem = applyLobbyRematch(
      rem1.nextState,
      { playerSlot: 0, matchId: 'm-rematch-2', wantRematch: true },
      t0 + 2150,
    );
    expect(dupRem.accepted).toBe(true);
    expect(dupRem.startedCountdown).toBe(false);
    expect(dupRem.nextState.status).toBe('countdown');
    expect(dupRem.nextState.activeMatchId).toBe('m-rematch-2'); // matchId not replaced!
  });

  it('applyLobbyLeave with reason new_lobby resets state cleanly', () => {
    let state = createInitialLobbyState('lobby-room-to-reset', t0);
    state = applyLobbyJoin(state, { playerSlot: 0, assetsReady: true }, t0);
    state = applyLobbyJoin(state, { playerSlot: 1, assetsReady: true }, t0);

    const resetState = applyLobbyLeave(state, { playerSlot: 0, reason: 'new_lobby' }, t0 + 100);
    expect(resetState.status).toBe('lobby');
    expect(resetState.activeMatchId).toBeNull();
    expect(resetState.confirmedConfig).toBeNull();
    expect(resetState.players[0].ready).toBe(false);
    expect(resetState.players[1].ready).toBe(false);
  });

  it('applyLobbyConnectionChange properly isolates countdown vs. in_match disconnect', () => {
    let state = createInitialLobbyState('lobby-conn', t0);
    state = applyLobbyJoin(state, { playerSlot: 0, assetsReady: true }, t0);
    state = applyLobbyJoin(state, { playerSlot: 1, assetsReady: true }, t0);
    state = (
      applyLobbyReady(
        state,
        { playerSlot: 0, configVersion: 1, ready: true, assetsReady: true },
        t0,
        { matchId: 'm-cd-disc', matchSeq: 1, rackSeed: 1, scores: [0, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    state = (
      applyLobbyReady(
        state,
        { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
        t0 + 10,
        { matchId: 'm-cd-disc', matchSeq: 1, rackSeed: 1, scores: [0, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    expect(state.status).toBe('countdown');

    // Disconnect during countdown cancels start and returns to lobby
    const cdDisc = applyLobbyConnectionChange(state, 1, false, t0 + 20);
    expect(cdDisc.status).toBe('lobby');
    expect(cdDisc.confirmedConfig).toBeNull();
    expect(cdDisc.activeMatchId).toBeNull();

    // Now re-ready and promote to in_match
    let inMatchState = applyLobbyConnectionChange(cdDisc, 1, true, t0 + 30);
    inMatchState = (
      applyLobbyReady(
        inMatchState,
        { playerSlot: 1, configVersion: 1, ready: true, assetsReady: true },
        t0 + 40,
        { matchId: 'm-active-disc', matchSeq: 1, rackSeed: 2, scores: [0, 0] },
      ) as { accepted: true; nextState: typeof state }
    ).nextState;
    inMatchState = promoteCountdownToMatch(inMatchState, t0 + 2600);
    expect(inMatchState.status).toBe('in_match');
    expect(inMatchState.activeMatchId).toBe('m-active-disc');

    // Mid-match disconnect MUST preserve activeMatchId for recovery
    const matchDisc = applyLobbyConnectionChange(inMatchState, 1, false, t0 + 3000);
    expect(matchDisc.status).toBe('in_match');
    expect(matchDisc.activeMatchId).toBe('m-active-disc');
    expect(matchDisc.players[1].connected).toBe(false);
  });
});
