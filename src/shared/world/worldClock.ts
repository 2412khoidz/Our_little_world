import {
  clockIconKind,
  hourFromTimestamp,
  lighting,
  type LightingPresentationState,
  type TimeOfDayMode,
} from '../donor/ai-farm-xay-nha/dayCyclePresentation';
import { weatherPresentationForDay, type WorldWeatherPresentation } from './worldWeatherPresentation';

export type { TimeOfDayMode };
export { loadTimeOfDayMode, saveTimeOfDayMode } from '../donor/ai-farm-xay-nha/dayCyclePresentation';

export interface WorldClockPresentation {
  nowMs: number;
  hour: number;
  timeLabelVi: string;
  calendarDay: number;
  lighting: LightingPresentationState;
  weather: WorldWeatherPresentation;
  clockIcon: 'sun' | 'moon';
}

function formatTimeVi(nowMs: number): string {
  return new Date(nowMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function calendarDayIndex(nowMs: number, worldCreatedAtMs: number): number {
  return Math.max(1, Math.floor((nowMs - worldCreatedAtMs) / 86_400_000) + 1);
}

/**
 * Single presentation authority: callers pass wall/server `nowMs` from App shell only.
 */
export function resolveWorldClockPresentation(input: {
  nowMs: number;
  worldId: string;
  worldCreatedAtMs: number;
  mode: TimeOfDayMode;
}): WorldClockPresentation {
  const hour = hourFromTimestamp(input.nowMs);
  const lightingState = lighting(hour, input.mode);
  const calendarDay = calendarDayIndex(input.nowMs, input.worldCreatedAtMs);
  const weather = weatherPresentationForDay(input.worldId, calendarDay, input.nowMs);
  return {
    nowMs: input.nowMs,
    hour,
    timeLabelVi: formatTimeVi(input.nowMs),
    calendarDay,
    lighting: lightingState,
    weather,
    clockIcon: clockIconKind(hour, lightingState.night),
  };
}

/** Map donor background + night factor to a Phaser-friendly fullscreen tint. */
export function phaserLightingOverlayFromPresentation(
  presentation: WorldClockPresentation,
): { color: number; alpha: number; weatherDim: number } {
  const { night, backgroundColor } = presentation.lighting;
  const hex = backgroundColor.replace('#', '');
  const color = Number.parseInt(hex, 16);
  const alpha = Math.min(0.42, night * 0.38 + (presentation.weather.kind === 'drizzle' ? 0.08 : 0));
  const weatherDim =
    presentation.weather.kind === 'cloudy' ? 0.06 : presentation.weather.kind === 'drizzle' ? 0.12 : 0;
  return { color, alpha: alpha + weatherDim, weatherDim };
}