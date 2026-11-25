import { describe, expect, it } from 'vitest';
import { resolveWorldClockPresentation } from '../../src/shared/world/worldClock';

describe('worldClock presentation authority', () => {
  const base = {
    worldId: 'world-a',
    worldCreatedAtMs: Date.UTC(2026, 0, 1),
    mode: 'auto' as const,
  };

  it('derives calendar day from world createdAt', () => {
    const noon = Date.UTC(2026, 0, 3, 12);
    const p = resolveWorldClockPresentation({ ...base, nowMs: noon });
    expect(p.calendarDay).toBe(3);
    expect(p.timeLabelVi).toMatch(/\d{1,2}:\d{2}/);
  });

  it('keeps weather stable for the same world day', () => {
    const a = resolveWorldClockPresentation({ ...base, nowMs: Date.UTC(2026, 0, 5, 10) });
    const b = resolveWorldClockPresentation({ ...base, nowMs: Date.UTC(2026, 0, 5, 18) });
    expect(a.weather.kind).toBe(b.weather.kind);
  });

  it('forces daylight in day mode', () => {
    const p = resolveWorldClockPresentation({
      ...base,
      nowMs: Date.UTC(2026, 0, 5, 23),
      mode: 'day',
    });
    expect(p.lighting.night).toBe(0);
    expect(p.clockIcon).toBe('sun');
  });
});