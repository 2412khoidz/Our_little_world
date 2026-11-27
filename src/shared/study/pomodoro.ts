/**
 * Pure TypeScript Pomodoro timer helpers.
 * Core functions (`PomodoroState`, `createPomodoroState`, `getRemainingMs`,
 * `getRemainingFormatted`, `isPhaseOver`, `nextPhase`, `getProgressPercent`)
 * ported from `cocoworking@947494f` (`packages/shared/src/pomodoro.ts`, MIT).
 */

import type { DerivedStudyView, StudySession } from './studyTypes';

export type PomodoroPhase = 'idle' | 'focus' | 'break';

export interface PomodoroConfig {
  focusMinutes: number;
  breakMinutes: number;
}

export interface PomodoroState {
  phase: PomodoroPhase;
  startedAt: number;
  endsAt: number;
  config: PomodoroConfig;
  startedBy: string;
}

export const DEFAULT_CONFIG: PomodoroConfig = {
  focusMinutes: 25,
  breakMinutes: 5,
};

export const LONG_CONFIG: PomodoroConfig = {
  focusMinutes: 50,
  breakMinutes: 10,
};

export function createPomodoroState(
  playerId: string,
  config: PomodoroConfig,
  now: number,
): PomodoroState {
  return {
    phase: 'focus',
    startedAt: now,
    endsAt: now + config.focusMinutes * 60 * 1000,
    config,
    startedBy: playerId,
  };
}

export function getRemainingMs(state: PomodoroState, now: number): number {
  return Math.max(0, state.endsAt - now);
}

export function formatDurationMmSs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getRemainingFormatted(state: PomodoroState, now: number): string {
  return formatDurationMmSs(getRemainingMs(state, now));
}

export function isPhaseOver(state: PomodoroState, now: number): boolean {
  return now >= state.endsAt;
}

export function nextPhase(state: PomodoroState, now: number): PomodoroState | null {
  if (state.phase === 'focus') {
    return {
      ...state,
      phase: 'break',
      startedAt: now,
      endsAt: now + state.config.breakMinutes * 60 * 1000,
    };
  }
  return null;
}

export function getProgressPercent(state: PomodoroState, now: number): number {
  const total = state.endsAt - state.startedAt;
  if (total <= 0) return 100;
  const elapsed = now - state.startedAt;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

/**
 * Derives exact StudySession phase and remaining ms at `serverNowMs` purely from
 * persisted server timestamps (`startedAtMs`, `endsAtMs`), guaranteeing screen lock
 * or page reload never resets or drifts timer accuracy.
 */
export function deriveStudySessionAt(session: StudySession, serverNowMs: number): DerivedStudyView {
  const focusDurationMs = session.focusMinutes * 60_000;
  const breakDurationMs = session.breakMinutes * 60_000;

  if (session.status === 'completed' || session.phase === 'completed') {
    return {
      phase: 'completed',
      status: 'completed',
      startedAtMs: session.startedAtMs,
      endsAtMs: session.endsAtMs,
      remainingMs: 0,
      totalDurationMs: breakDurationMs || focusDurationMs,
      progressPercent: 100,
    };
  }

  if (session.status === 'paused') {
    const total = session.phase === 'break' ? breakDurationMs : focusDurationMs;
    const rem = Math.max(0, Math.min(total, session.remainingMs));
    return {
      phase: session.phase,
      status: 'paused',
      startedAtMs: session.startedAtMs,
      endsAtMs: session.endsAtMs,
      remainingMs: rem,
      totalDurationMs: total,
      progressPercent: total > 0 ? ((total - rem) / total) * 100 : 100,
    };
  }

  if (session.phase === 'focus') {
    if (serverNowMs < session.endsAtMs) {
      const rem = session.endsAtMs - serverNowMs;
      const total = Math.max(1, session.endsAtMs - session.startedAtMs);
      return {
        phase: 'focus',
        status: 'running',
        startedAtMs: session.startedAtMs,
        endsAtMs: session.endsAtMs,
        remainingMs: rem,
        totalDurationMs: total,
        progressPercent: Math.min(100, Math.max(0, ((total - rem) / total) * 100)),
      };
    }

    const breakStart = session.endsAtMs;
    const breakEnd = breakStart + breakDurationMs;
    if (breakDurationMs > 0 && serverNowMs < breakEnd) {
      const rem = breakEnd - serverNowMs;
      return {
        phase: 'break',
        status: 'running',
        startedAtMs: breakStart,
        endsAtMs: breakEnd,
        remainingMs: rem,
        totalDurationMs: breakDurationMs,
        progressPercent: Math.min(100, Math.max(0, ((breakDurationMs - rem) / breakDurationMs) * 100)),
      };
    }

    return {
      phase: 'completed',
      status: 'completed',
      startedAtMs: breakStart,
      endsAtMs: breakEnd,
      remainingMs: 0,
      totalDurationMs: breakDurationMs || focusDurationMs,
      progressPercent: 100,
    };
  }

  // Running break phase
  if (serverNowMs < session.endsAtMs) {
    const rem = session.endsAtMs - serverNowMs;
    const total = Math.max(1, session.endsAtMs - session.startedAtMs);
    return {
      phase: 'break',
      status: 'running',
      startedAtMs: session.startedAtMs,
      endsAtMs: session.endsAtMs,
      remainingMs: rem,
      totalDurationMs: total,
      progressPercent: Math.min(100, Math.max(0, ((total - rem) / total) * 100)),
    };
  }

  return {
    phase: 'completed',
    status: 'completed',
    startedAtMs: session.startedAtMs,
    endsAtMs: session.endsAtMs,
    remainingMs: 0,
    totalDurationMs: breakDurationMs || focusDurationMs,
    progressPercent: 100,
  };
}
