import { describe, expect, it } from 'vitest';
import {
  createPomodoroState,
  DEFAULT_CONFIG,
  deriveStudySessionAt,
  formatDurationMmSs,
  getProgressPercent,
  getRemainingFormatted,
  getRemainingMs,
  isPhaseOver,
  nextPhase,
} from '../../src/shared/study/pomodoro';
import type { StudySession } from '../../src/shared/study/studyTypes';

describe('Pomodoro Pure Engine (cocoworking MIT + OLW-015-05 server timestamps)', () => {
  it('reproduces cocoworking focus -> break -> completion transitions cleanly', () => {
    const t0 = 1_700_000_000_000;
    const focus = createPomodoroState('user-a', DEFAULT_CONFIG, t0);
    expect(focus.phase).toBe('focus');
    expect(getRemainingMs(focus, t0)).toBe(25 * 60_000);
    expect(getRemainingFormatted(focus, t0)).toBe('25:00');
    expect(isPhaseOver(focus, t0 + 25 * 60_000 - 1)).toBe(false);
    expect(isPhaseOver(focus, t0 + 25 * 60_000)).toBe(true);

    const brk = nextPhase(focus, t0 + 25 * 60_000)!;
    expect(brk.phase).toBe('break');
    expect(getRemainingFormatted(brk, t0 + 25 * 60_000)).toBe('05:00');
    expect(getProgressPercent(brk, t0 + 27.5 * 60_000)).toBeCloseTo(50);

    expect(nextPhase(brk, t0 + 30 * 60_000)).toBeNull();
  });

  it('derives phase accurately across screen lock / reload past endsAt without interval drift', () => {
    const start = 1_700_000_000_000;
    const session: StudySession = {
      id: 's1',
      worldId: 'w1',
      ownerId: 'u1',
      mode: 'shared',
      phase: 'focus',
      status: 'running',
      focusMinutes: 25,
      breakMinutes: 5,
      startedAtMs: start,
      endsAtMs: start + 25 * 60_000,
      remainingMs: 25 * 60_000,
      version: 1,
      updatedAt: '2026-11-25T00:00:00Z',
    };

    // 10 minutes locked during focus
    const at10m = deriveStudySessionAt(session, start + 10 * 60_000);
    expect(at10m.phase).toBe('focus');
    expect(formatDurationMmSs(at10m.remainingMs)).toBe('15:00');

    // Reloaded 27 minutes later -> automatically in break phase (3 minutes left)
    const at27m = deriveStudySessionAt(session, start + 27 * 60_000);
    expect(at27m.phase).toBe('break');
    expect(at27m.status).toBe('running');
    expect(formatDurationMmSs(at27m.remainingMs)).toBe('03:00');

    // Reloaded 35 minutes later -> completed cleanly
    const at35m = deriveStudySessionAt(session, start + 35 * 60_000);
    expect(at35m.phase).toBe('completed');
    expect(at35m.status).toBe('completed');
    expect(at35m.remainingMs).toBe(0);
  });
});
