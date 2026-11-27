import { weatherForWorldDay, type WeatherDef, type WeatherId } from '../donor/webfarmville-c420bc2/weatherRules.ts';
import { resolveWorldCalendar } from './worldCalendar.ts';

/** Presentation-only weather bucket preserved alongside exact deep weather metadata. */
export type WorldWeatherKind = 'clear' | 'cloudy' | 'drizzle';

export interface WorldWeatherPresentation {
  kind: WorldWeatherKind;
  labelVi: string;
  /** 0–1 particle density for drizzle/snow. */
  intensity: number;
  /** Deep farming weather identifier (sunny/cloudy/rain/storm/windy/snow/rainbow). */
  weatherId?: WeatherId;
  emoji?: string;
  perkVi?: string;
  wet?: boolean;
  cropSpeedBp?: number;
  treeBonusYield?: number;
  harvestBonusYield?: number;
}

function toPresentationKind(id: WeatherId): WorldWeatherKind {
  if (id === 'rain' || id === 'storm' || id === 'snow') return 'drizzle';
  if (id === 'cloudy' || id === 'windy') return 'cloudy';
  return 'clear';
}

function toIntensity(def: WeatherDef): number {
  if (def.id === 'storm') return 0.78;
  if (def.id === 'rain') return 0.56;
  if (def.id === 'snow') return 0.45;
  if (def.id === 'cloudy' || def.id === 'windy') return 0.18;
  return 0;
}

/**
 * Deterministic weather derived from calendar day + Webfarmville donor weather rules.
 */
export function weatherPresentationForDay(
  worldId: string,
  dayIndex: number,
  nowMs: number,
  worldEpochMs = 0,
): WorldWeatherPresentation {
  const cal = resolveWorldCalendar(nowMs, worldEpochMs);
  const effectiveDay = dayIndex > 0 ? dayIndex : cal.totalDay;
  const def = weatherForWorldDay(worldId, effectiveDay, cal.season);
  return {
    kind: toPresentationKind(def.id),
    labelVi: def.nameVi,
    intensity: toIntensity(def),
    weatherId: def.id,
    emoji: def.emoji,
    perkVi: def.perkVi,
    wet: def.wet,
    cropSpeedBp: def.cropSpeedBp,
    treeBonusYield: def.treeBonusYield,
    harvestBonusYield: def.harvestBonusYield,
  };
}
