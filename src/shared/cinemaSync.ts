import type { CinemaCommand, CinemaSyncState, DriftDecision } from './types';

export interface RttSample {
  clientSendMs: number;
  serverNowMs: number;
  clientRecvMs: number;
}

export class ClockOffsetEstimator {
  private samples: Array<{ rttMs: number; offsetMs: number }> = [];

  constructor(private readonly maxSamples = 12) {}

  addSample(sample: RttSample): number {
    const rttMs = Math.max(0, sample.clientRecvMs - sample.clientSendMs);
    const midpointClientMs = sample.clientSendMs + rttMs / 2;
    const offsetMs = sample.serverNowMs - midpointClientMs;
    this.samples.push({ rttMs, offsetMs });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    return this.getOffsetMs();
  }

  /**
   * Selects the median offset among the lowest-RTT half of samples
   * to avoid asymmetric buffering/network spikes skewing time estimation.
   */
  getOffsetMs(): number {
    if (this.samples.length === 0) return 0;
    const sortedByRtt = [...this.samples].sort((a, b) => a.rttMs - b.rttMs);
    const halfCount = Math.max(1, Math.ceil(sortedByRtt.length / 2));
    const bestHalf = sortedByRtt.slice(0, halfCount).map((s) => s.offsetMs).sort((a, b) => a - b);
    const mid = Math.floor(bestHalf.length / 2);
    if (bestHalf.length % 2 === 1) {
      return bestHalf[mid] ?? 0;
    }
    return ((bestHalf[mid - 1] ?? 0) + (bestHalf[mid] ?? 0)) / 2;
  }

  getEstimatedServerNowMs(clientNowMs: number): number {
    return clientNowMs + this.getOffsetMs();
  }

  getLatestRttMs(): number | null {
    const last = this.samples[this.samples.length - 1];
    return last ? last.rttMs : null;
  }

  reset(): void {
    this.samples = [];
  }
}

export function computeExpectedPosition(state: CinemaSyncState, serverNowMs: number): number {
  if (state.status !== 'playing') {
    return Math.max(0, state.positionSec);
  }
  const elapsedSec = Math.max(0, (serverNowMs - state.effectiveAtServerMs) / 1000);
  return Math.max(0, state.positionSec + state.rate * elapsedSec);
}

export function evaluateDriftCorrection(
  actualSec: number,
  expectedSec: number,
  supportsRateAdjust = true,
): DriftDecision {
  const driftSec = actualSec - expectedSec;
  const absDriftMs = Math.abs(driftSec) * 1000;
  const signedDriftMs = Math.round(driftSec * 1000);

  if (absDriftMs <= 150) {
    return { action: 'ignore', driftMs: signedDriftMs };
  }

  if (absDriftMs <= 500) {
    if (!supportsRateAdjust) {
      return { action: 'ignore', driftMs: signedDriftMs };
    }
    // If client is ahead of expected, slow down slightly; if behind, speed up slightly
    const playbackRate = driftSec > 0 ? 0.97 : 1.03;
    return { action: 'rate', driftMs: signedDriftMs, playbackRate };
  }

  return { action: 'seek', driftMs: signedDriftMs, targetSec: Math.max(0, expectedSec) };
}

export type ApplyCinemaResult =
  | { ok: true; state: CinemaSyncState }
  | { ok: false; reason: 'REVISION_CONFLICT' | 'FORBIDDEN'; latestState: CinemaSyncState };

export function applyCinemaCommand(
  current: CinemaSyncState,
  command: CinemaCommand,
  serverNowMs: number,
): ApplyCinemaResult {
  if (command.expectedRevision !== current.revision) {
    return { ok: false, reason: 'REVISION_CONFLICT', latestState: current };
  }

  const isModeSwitch = command.action === 'set_mode';
  if (
    current.mode === 'host_only' &&
    command.senderId !== current.controllerId &&
    command.action !== 'buffer_start' &&
    command.action !== 'buffer_ready'
  ) {
    return { ok: false, reason: 'FORBIDDEN', latestState: current };
  }

  if (isModeSwitch && command.senderId !== current.controllerId) {
    return { ok: false, reason: 'FORBIDDEN', latestState: current };
  }

  const currentExpectedPos = computeExpectedPosition(current, serverNowMs);
  const nextPos = Math.max(0, command.desiredPositionSec ?? currentExpectedPos);

  if (command.action === 'play') {
    return {
      ok: true,
      state: {
        ...current,
        revision: current.revision + 1,
        status: 'playing',
        positionSec: nextPos,
        rate: 1,
        effectiveAtServerMs: serverNowMs,
        updatedAtServerMs: serverNowMs,
      },
    };
  }

  if (command.action === 'pause') {
    return {
      ok: true,
      state: {
        ...current,
        revision: current.revision + 1,
        status: 'paused',
        positionSec: nextPos,
        rate: 1,
        effectiveAtServerMs: serverNowMs,
        updatedAtServerMs: serverNowMs,
      },
    };
  }

  if (command.action === 'seek') {
    return {
      ok: true,
      state: {
        ...current,
        revision: current.revision + 1,
        positionSec: nextPos,
        effectiveAtServerMs: serverNowMs,
        updatedAtServerMs: serverNowMs,
      },
    };
  }

  if (command.action === 'set_mode' && command.desiredMode) {
    return {
      ok: true,
      state: {
        ...current,
        revision: current.revision + 1,
        mode: command.desiredMode,
        updatedAtServerMs: serverNowMs,
      },
    };
  }

  if (command.action === 'buffer_start') {
    return {
      ok: true,
      state: {
        ...current,
        revision: current.revision + 1,
        status: 'buffering',
        positionSec: currentExpectedPos,
        effectiveAtServerMs: serverNowMs,
        updatedAtServerMs: serverNowMs,
      },
    };
  }

  // buffer_ready
  return {
    ok: true,
    state: {
      ...current,
      revision: current.revision + 1,
      status: 'playing',
      positionSec: currentExpectedPos,
      rate: 1,
      effectiveAtServerMs: serverNowMs,
      updatedAtServerMs: serverNowMs,
    },
  };
}

export function shouldPauseForBuffering(
  bufferingStartedAtMs: number | null,
  nowMs: number,
  debounceMs = 750,
): boolean {
  if (bufferingStartedAtMs === null) return false;
  return nowMs - bufferingStartedAtMs >= debounceMs;
}

export class AntiEchoGuard {
  private suppressUntilMs = 0;

  markProgrammaticChange(nowMs: number, windowMs = 450): void {
    this.suppressUntilMs = Math.max(this.suppressUntilMs, nowMs + windowMs);
  }

  shouldIgnoreNativeEvent(nowMs: number): boolean {
    return nowMs <= this.suppressUntilMs;
  }
}
