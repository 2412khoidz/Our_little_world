import { describe, expect, it } from 'vitest';
import {
  pydewRainActiveFromClock,
  pydewRainDropCount,
  pydewRainFallSpeedPxPerSec,
  pydewRainGroupAlpha,
} from '../../src/shared/donor/pydew/pydewRainPresentation';
import type { WorldClockPresentation } from '../../src/shared/world/worldClock';

function clock(weather: WorldClockPresentation['weather']): Pick<WorldClockPresentation, 'weather'> {
  return { weather };
}

describe('pydewRainPresentation', () => {
  it('activates only for drizzle', () => {
    expect(pydewRainActiveFromClock(clock({ kind: 'clear', labelVi: 'Trời trong', intensity: 0 }))).toBe(
      false,
    );
    expect(pydewRainActiveFromClock(clock({ kind: 'drizzle', labelVi: 'Mưa nhẹ', intensity: 0.5 }))).toBe(
      true,
    );
  });

  it('scales drop count and motion with intensity', () => {
    expect(pydewRainDropCount(0)).toBe(16);
    expect(pydewRainDropCount(1)).toBe(64);
    expect(pydewRainGroupAlpha(0.5)).toBeCloseTo(0.7);
    expect(pydewRainFallSpeedPxPerSec(0)).toBe(110);
    expect(pydewRainFallSpeedPxPerSec(1)).toBe(250);
  });
});