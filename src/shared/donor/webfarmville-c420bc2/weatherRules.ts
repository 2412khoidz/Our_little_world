/**
 * Deterministic weather state & gameplay modifiers transplanted from
 * `Shiz0id/webfarmville` @ c420bc253f5de9dbaec636a729f4b4b2866248c4
 * Original source: shared/src/content/weather.ts (SPDX-License-Identifier: MIT).
 */
import type { CalendarSeason } from '../../world/worldCalendar.ts';

export type WeatherId = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'windy' | 'snow' | 'rainbow';

export interface WeatherDef {
  readonly id: WeatherId;
  readonly nameVi: string;
  readonly emoji: string;
  readonly perkVi: string;
  readonly wet: boolean;
  readonly cozy: boolean;
  /** Growth speed multiplier in basis points (e.g. 12_500 = +25% faster). */
  readonly cropSpeedBp: number;
  /** Flat bonus items on tree shake (`windy`) or field harvest (`rainbow`). */
  readonly treeBonusYield: number;
  readonly harvestBonusYield: number;
  /** Rare quality weight bonus in basis points. */
  readonly qualityBoostBp: number;
}

export const WEATHER_DEFS: Readonly<Record<WeatherId, WeatherDef>> = {
  sunny: {
    id: 'sunny',
    nameVi: 'Nắng ấm',
    emoji: '☀️',
    perkVi: 'Trời quang nắng nhẹ — một ngày làm vườn êm ả.',
    wet: false,
    cozy: false,
    cropSpeedBp: 10_000,
    treeBonusYield: 0,
    harvestBonusYield: 0,
    qualityBoostBp: 0,
  },
  cloudy: {
    id: 'cloudy',
    nameVi: 'Nhiều mây',
    emoji: '⛅',
    perkVi: 'Mây mát dịu — cá hồ cắn câu bạo hơn thường lệ.',
    wet: false,
    cozy: false,
    cropSpeedBp: 10_000,
    treeBonusYield: 0,
    harvestBonusYield: 0,
    qualityBoostBp: 200,
  },
  rain: {
    id: 'rain',
    nameVi: 'Mưa rào',
    emoji: '🌧️',
    perkVi: 'Mưa tự tưới ẩm mọi luống ngoài trời — cây lớn nhanh hơn 25%.',
    wet: true,
    cozy: true,
    cropSpeedBp: 12_500,
    treeBonusYield: 0,
    harvestBonusYield: 0,
    qualityBoostBp: 300,
  },
  storm: {
    id: 'storm',
    nameVi: 'Giông bão',
    emoji: '⛈️',
    perkVi: 'Mưa lớn tự tưới ruộng (+25% tốc độ) và tăng cơ hội gặp cá hiếm.',
    wet: true,
    cozy: true,
    cropSpeedBp: 12_500,
    treeBonusYield: 0,
    harvestBonusYield: 0,
    qualityBoostBp: 600,
  },
  windy: {
    id: 'windy',
    nameVi: 'Gió mùa',
    emoji: '🍃',
    perkVi: 'Gió thổi rung cành — +1 trái thu hoạch từ mỗi cây ăn quả.',
    wet: false,
    cozy: false,
    cropSpeedBp: 10_000,
    treeBonusYield: 1,
    harvestBonusYield: 0,
    qualityBoostBp: 100,
  },
  snow: {
    id: 'snow',
    nameVi: 'Tuyết rơi',
    emoji: '❄️',
    perkVi: 'Ngày tuyết ấm áp bên bếp lửa — giữ tinh thần nhà nông mùa Đông.',
    wet: false,
    cozy: true,
    cropSpeedBp: 10_000,
    treeBonusYield: 0,
    harvestBonusYield: 0,
    qualityBoostBp: 400,
  },
  rainbow: {
    id: 'rainbow',
    nameVi: 'Cầu vồng',
    emoji: '🌈',
    perkVi: 'May mắn cầu vồng: +1 sản lượng khi thu hoạch ngoài vườn!',
    wet: false,
    cozy: true,
    cropSpeedBp: 11_000,
    treeBonusYield: 1,
    harvestBonusYield: 1,
    qualityBoostBp: 1_000,
  },
};

function hashSeed(worldId: string, day: number): number {
  let h = 2166136261 ^ day;
  for (let i = 0; i < worldId.length; i += 1) {
    h ^= worldId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic weather roll adapted from Meadowbrook `weatherAt` by season. */
export function weatherForWorldDay(
  worldId: string,
  totalDay: number,
  season: CalendarSeason,
): WeatherDef {
  // Day 1 is always sunny so opening a farm is calm & welcoming.
  if (totalDay <= 1) return WEATHER_DEFS.sunny;
  const roll = (hashSeed(worldId, totalDay) % 1000) / 1000;

  if (season === 'winter') {
    if (roll < 0.32) return WEATHER_DEFS.snow;
    if (roll < 0.62) return WEATHER_DEFS.cloudy;
    if (roll < 0.80) return WEATHER_DEFS.windy;
    if (roll < 0.96) return WEATHER_DEFS.sunny;
    return WEATHER_DEFS.rainbow;
  }
  if (season === 'summer') {
    if (roll < 0.44) return WEATHER_DEFS.sunny;
    if (roll < 0.62) return WEATHER_DEFS.cloudy;
    if (roll < 0.78) return WEATHER_DEFS.rain;
    if (roll < 0.90) return WEATHER_DEFS.storm;
    if (roll < 0.96) return WEATHER_DEFS.windy;
    return WEATHER_DEFS.rainbow;
  }
  if (season === 'fall') {
    if (roll < 0.34) return WEATHER_DEFS.windy;
    if (roll < 0.58) return WEATHER_DEFS.sunny;
    if (roll < 0.78) return WEATHER_DEFS.cloudy;
    if (roll < 0.94) return WEATHER_DEFS.rain;
    return WEATHER_DEFS.rainbow;
  }
  // spring
  if (roll < 0.38) return WEATHER_DEFS.sunny;
  if (roll < 0.62) return WEATHER_DEFS.rain;
  if (roll < 0.80) return WEATHER_DEFS.cloudy;
  if (roll < 0.90) return WEATHER_DEFS.windy;
  if (roll < 0.95) return WEATHER_DEFS.storm;
  return WEATHER_DEFS.rainbow;
}

export function forecastWeatherDays(
  worldId: string,
  startDay: number,
  count: number,
  seasonAtDay: (day: number) => CalendarSeason,
): readonly WeatherDef[] {
  const out: WeatherDef[] = [];
  for (let i = 0; i < count; i += 1) {
    const day = startDay + i;
    out.push(weatherForWorldDay(worldId, day, seasonAtDay(day)));
  }
  return out;
}
