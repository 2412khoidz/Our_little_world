import { createRng, deriveSeed } from '../rng';

/** Presentation-only weather; does not affect farm growth or inventory authority. */
export type WorldWeatherKind = 'clear' | 'cloudy' | 'drizzle';

const WEATHER_LABEL_VI: Record<WorldWeatherKind, string> = {
  clear: 'Trời trong',
  cloudy: 'Nhiều mây',
  drizzle: 'Mưa nhẹ',
};

export interface WorldWeatherPresentation {
  kind: WorldWeatherKind;
  labelVi: string;
  /** 0–1 particle density for drizzle. */
  intensity: number;
}

/**
 * Stable weather for a calendar day per world (reimplementation: donor has no weather module;
 * channel uses OLW rng rules for reproducible presentation).
 */
export function weatherPresentationForDay(worldId: string, dayIndex: number, nowMs: number): WorldWeatherPresentation {
  const seed = deriveSeed(hashWorldDay(worldId, dayIndex), 'weather-presentation');
  const rng = createRng(seed);
  const hour = new Date(nowMs).getHours();
  const kind = rng.weighted([
    { value: 'clear' as const, weight: hour >= 20 || hour < 6 ? 0.55 : 0.42 },
    { value: 'cloudy' as const, weight: 0.38 },
    { value: 'drizzle' as const, weight: 0.2 },
  ]);
  const intensity =
    kind === 'drizzle' ? 0.35 + rng.next() * 0.45 : kind === 'cloudy' ? 0.12 + rng.next() * 0.15 : 0;
  return { kind, labelVi: WEATHER_LABEL_VI[kind], intensity };
}

function hashWorldDay(worldId: string, dayIndex: number): number {
  let hash = 0;
  const input = `${worldId}|${dayIndex}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}