import type { WorldClockPresentation } from '../../world/worldClock';

/** BootScene texture keys — PyDew Valley rain/drops (CC0, vendored under public/maps/donor/pydew-valley). */
export const PYDEW_RAIN_DROP_TEXTURE_KEYS = [
  'donor-pydew-rain-drop-0',
  'donor-pydew-rain-drop-1',
  'donor-pydew-rain-drop-2',
] as const;

export const PYDEW_RAIN_DROP_URLS = [
  '/maps/donor/pydew-valley/graphics/rain/drops/0.png',
  '/maps/donor/pydew-valley/graphics/rain/drops/1.png',
  '/maps/donor/pydew-valley/graphics/rain/drops/2.png',
] as const;

export function pydewRainActiveFromClock(presentation: Pick<WorldClockPresentation, 'weather'>): boolean {
  return presentation.weather.kind === 'drizzle';
}

export function pydewRainDropCount(intensity: number): number {
  const clamped = Math.max(0, Math.min(1, intensity));
  return Math.min(64, Math.max(16, Math.floor(16 + clamped * 48)));
}

export function pydewRainGroupAlpha(intensity: number): number {
  const clamped = Math.max(0, Math.min(1, intensity));
  return 0.5 + clamped * 0.4;
}

export function pydewRainFallSpeedPxPerSec(intensity: number): number {
  const clamped = Math.max(0, Math.min(1, intensity));
  return 110 + clamped * 140;
}