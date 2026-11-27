import { describe, expect, it } from 'vitest';
import {
  farmContextFromWorldClock,
  farmSeasonForCalendarDay,
  farmSeedRecommendedThisSeason,
} from '../../src/shared/farming/farmWorldClockBridge';
import type { WorldClockPresentation } from '../../src/shared/world/worldClock';

function mockClock(calendarDay: number): WorldClockPresentation {
  return {
    nowMs: Date.now(),
    hour: 12,
    timeLabelVi: '12:00',
    calendarDay,
    lighting: {
      hour: 12,
      night: 0,
      sunColor: '#ffffff',
      sunIntensity: 1,
      hemisphereSkyColor: '#87b8f5',
      hemisphereGroundColor: '#4a5c3a',
      hemisphereIntensity: 0.5,
      backgroundColor: '#87b8f5',
      fogColor: '#87b8f5',
      exposure: 1,
      sunDirection: [0, 1, 0] as const,
      unlitTint: [1, 1, 1] as const,
    },
    weather: { kind: 'clear', labelVi: 'Nắng ấm', intensity: 0 },
    clockIcon: 'sun',
  };
}

describe('farmWorldClockBridge', () => {
  it('cycles spring → summer → fall → winter every 28 calendar days', () => {
    expect(farmSeasonForCalendarDay(1)).toBe('spring');
    expect(farmSeasonForCalendarDay(28)).toBe('spring');
    expect(farmSeasonForCalendarDay(29)).toBe('summer');
    expect(farmSeasonForCalendarDay(57)).toBe('fall');
    expect(farmSeasonForCalendarDay(85)).toBe('winter');
  });

  it('recommends seasonal seeds matching the 4-season deep crop table', () => {
    expect(farmSeedRecommendedThisSeason('seed_tomato', 'summer')).toBe(true);
    expect(farmSeedRecommendedThisSeason('seed_tomato', 'winter')).toBe(false);
    expect(farmSeedRecommendedThisSeason('seed_wheat', 'summer')).toBe(true);
    expect(farmSeedRecommendedThisSeason('seed_carrot', 'spring')).toBe(true);
  });

  it('builds farm context from world clock presentation', () => {
    const ctx = farmContextFromWorldClock(mockClock(1));
    expect(ctx.season).toBe('spring');
    expect(ctx.recommendedSeedSkus).toContain('seed_carrot');
    expect(ctx.recommendedSeedSkus).toContain('seed_strawberry');
    expect(ctx.recommendedSeedSkus).not.toContain('seed_tomato');
  });
});
