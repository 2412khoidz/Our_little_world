import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clockIconKind,
  hourFromTimestamp,
  lighting,
  loadTimeOfDayMode,
  saveTimeOfDayMode,
} from '../../src/shared/donor/ai-farm-xay-nha/dayCyclePresentation';

describe('AI Farm day/night lighting (transplant)', () => {
  it('uses the requested phase boundaries', () => {
    expect(lighting(5).night).toBe(1);
    expect(lighting(7).night).toBe(0);
    expect(lighting(21).night).toBe(0);
    expect(lighting(23).night).toBe(1);
    expect(lighting(19).night).toBe(0);
    expect(lighting(2).night).toBe(1);
  });

  it('supports forced day and night modes regardless of hour', () => {
    expect(lighting(22, 'day').night).toBe(0);
    expect(lighting(12, 'night').night).toBe(1);
  });

  it('computes hour from timestamp accurately', () => {
    const date = new Date(2026, 9, 12, 13, 30, 0);
    expect(hourFromTimestamp(date.getTime())).toBeCloseTo(13.5, 3);
  });

  it('picks HUD icon from night factor', () => {
    expect(clockIconKind(13, 0)).toBe('sun');
    expect(clockIconKind(13, 1)).toBe('moon');
  });
});

describe('OLW time-of-day mode persistence', () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      clear: () => store.clear(),
    });
  });

  it('defaults to auto when no preference is saved', () => {
    expect(loadTimeOfDayMode()).toBe('auto');
  });

  it('persists and loads valid modes', () => {
    saveTimeOfDayMode('night');
    expect(loadTimeOfDayMode()).toBe('night');
    saveTimeOfDayMode('day');
    expect(loadTimeOfDayMode()).toBe('day');
  });
});