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
    weather: { kind: 'clear', labelVi: 'Trời trong', intensity: 0 },
    clockIcon: 'sun',
  };
}

describe('farmWorldClockBridge', () => {
  it('cycles hot → rainy → cool every 14 calendar days', () => {
    expect(farmSeasonForCalendarDay(1)).toBe('hot');
    expect(farmSeasonForCalendarDay(14)).toBe('hot');
    expect(farmSeasonForCalendarDay(15)).toBe('rainy');
    expect(farmSeasonForCalendarDay(29)).toBe('cool');
  });

  it('marks tomato cool-season and wheat all-season', () => {
    expect(farmSeedRecommendedThisSeason('seed_tomato', 'cool')).toBe(true);
    expect(farmSeedRecommendedThisSeason('seed_tomato', 'hot')).toBe(false);
    expect(farmSeedRecommendedThisSeason('seed_wheat', 'hot')).toBe(true);
  });

  it('builds farm context from world clock presentation', () => {
    const ctx = farmContextFromWorldClock(mockClock(1));
    expect(ctx.season).toBe('hot');
    expect(ctx.recommendedSeedSkus).toContain('seed_wheat');
    expect(ctx.recommendedSeedSkus).not.toContain('seed_tomato');
  });
});