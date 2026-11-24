import { describe, expect, it } from 'vitest';
import {
  AntiEchoGuard,
  applyCinemaCommand,
  ClockOffsetEstimator,
  computeExpectedPosition,
  evaluateDriftCorrection,
  shouldPauseForBuffering,
} from '../../src/shared/cinemaSync';
import type { CinemaSyncState } from '../../src/shared/types';

function makeState(overrides: Partial<CinemaSyncState> = {}): CinemaSyncState {
  return {
    sessionId: 'spike-1',
    mediaId: 'sample-cozy-sync.mp4',
    revision: 1,
    controllerId: 'user-a',
    mode: 'host_only',
    status: 'paused',
    positionSec: 1.5,
    rate: 1,
    effectiveAtServerMs: 10_000,
    updatedAtServerMs: 10_000,
    ...overrides,
  };
}

describe('Spike 0 cinema synchronization math', () => {
  it('estimates clock offset prioritizing lowest RTT samples', () => {
    const est = new ClockOffsetEstimator(6);
    // True server offset is +500ms; add one noisy spike sample and clean low-RTT samples
    est.addSample({ clientSendMs: 1000, serverNowMs: 1550, clientRecvMs: 1100 }); // rtt=100, offset=+500
    est.addSample({ clientSendMs: 2000, serverNowMs: 2520, clientRecvMs: 2040 }); // rtt=40, offset=+500
    est.addSample({ clientSendMs: 3000, serverNowMs: 4200, clientRecvMs: 4000 }); // rtt=1000, offset=+700
    expect(est.getOffsetMs()).toBe(500);
  });

  it('computes expected position when playing vs paused', () => {
    const paused = makeState({ status: 'paused', positionSec: 4.2, effectiveAtServerMs: 1000 });
    expect(computeExpectedPosition(paused, 5000)).toBeCloseTo(4.2);

    const playing = makeState({ status: 'playing', positionSec: 2.0, rate: 1, effectiveAtServerMs: 1000 });
    expect(computeExpectedPosition(playing, 3500)).toBeCloseTo(4.5);
  });

  it('evaluates drift thresholds accurately (<=150ms ignore, 150-500ms rate, >500ms seek)', () => {
    expect(evaluateDriftCorrection(10.1, 10.0, true).action).toBe('ignore');
    expect(evaluateDriftCorrection(10.3, 10.0, true)).toEqual({
      action: 'rate',
      driftMs: 300,
      playbackRate: 0.97,
    });
    expect(evaluateDriftCorrection(9.7, 10.0, true)).toEqual({
      action: 'rate',
      driftMs: -300,
      playbackRate: 1.03,
    });
    // Without rate adjustment support, moderate drift ignores instead of thrashing seeks
    expect(evaluateDriftCorrection(9.7, 10.0, false).action).toBe('ignore');
    expect(evaluateDriftCorrection(9.2, 10.0, true)).toEqual({
      action: 'seek',
      driftMs: -800,
      targetSec: 10.0,
    });
  });

  it('enforces compare-and-swap revisions and host-only vs both permissions', () => {
    const initial = makeState({ mode: 'host_only', controllerId: 'user-a', revision: 1 });

    // Non-host blocked in host_only mode
    const denied = applyCinemaCommand(
      initial,
      { commandId: 'c1', senderId: 'user-b', expectedRevision: 1, action: 'play' },
      12_000,
    );
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe('FORBIDDEN');

    // Host starts playback
    const played = applyCinemaCommand(
      initial,
      { commandId: 'c2', senderId: 'user-a', expectedRevision: 1, action: 'play', desiredPositionSec: 0 },
      12_000,
    );
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(played.state.revision).toBe(2);
    expect(played.state.status).toBe('playing');

    // Stale expectedRevision rejected
    const stale = applyCinemaCommand(
      played.state,
      { commandId: 'c3', senderId: 'user-a', expectedRevision: 1, action: 'pause' },
      13_000,
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toBe('REVISION_CONFLICT');
  });

  it('debounces buffering and suppresses programmatic echo events', () => {
    expect(shouldPauseForBuffering(null, 2000, 750)).toBe(false);
    expect(shouldPauseForBuffering(1500, 2000, 750)).toBe(false);
    expect(shouldPauseForBuffering(1000, 2000, 750)).toBe(true);

    const guard = new AntiEchoGuard();
    guard.markProgrammaticChange(1000, 400);
    expect(guard.shouldIgnoreNativeEvent(1200)).toBe(true);
    expect(guard.shouldIgnoreNativeEvent(1500)).toBe(false);
  });
});
