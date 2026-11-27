import type { WorldClockPresentation } from '../world/worldClock';
import {
  DAYS_PER_SEASON,
  CALENDAR_SEASONS,
  SEASON_LABEL_VI,
  type CalendarSeason,
} from '../world/worldCalendar';
import { getDeepCropDefinition } from './deepCropSimulation';
import { FARM_SHOP_SEED_SKUS } from './farmShipping';

export type FarmPresentationSeason = CalendarSeason;

export const FARM_SEASON_LABEL_VI: Record<FarmPresentationSeason, string> = SEASON_LABEL_VI;

export function farmSeasonForCalendarDay(calendarDay: number): FarmPresentationSeason {
  const slot = Math.floor((Math.max(1, calendarDay) - 1) / DAYS_PER_SEASON) % CALENDAR_SEASONS.length;
  return CALENDAR_SEASONS[slot] ?? 'spring';
}

export function farmSeedRecommendedThisSeason(
  seedSku: string,
  season: FarmPresentationSeason,
): boolean {
  const cropSku = seedSku.startsWith('seed_')
    ? seedSku.slice('seed_'.length)
    : seedSku.startsWith('sapling_')
      ? seedSku.slice('sapling_'.length)
      : seedSku;
  const deep = getDeepCropDefinition(cropSku);
  if (!deep) return true;
  return deep.seasons.includes(season);
}

export interface FarmWorldClockFarmContext {
  season: FarmPresentationSeason;
  seasonLabelVi: string;
  calendarDay: number;
  dayOfSeason: number;
  year: number;
  weatherLabelVi: string;
  weatherPerkVi?: string;
  recommendedSeedSkus: readonly string[];
}

export function farmContextFromWorldClock(clock: WorldClockPresentation): FarmWorldClockFarmContext {
  const season = clock.calendar?.season ?? farmSeasonForCalendarDay(clock.calendarDay);
  const recommendedSeedSkus = FARM_SHOP_SEED_SKUS.filter((sku) =>
    farmSeedRecommendedThisSeason(sku, season),
  );
  return {
    season,
    seasonLabelVi: FARM_SEASON_LABEL_VI[season],
    calendarDay: clock.calendarDay,
    dayOfSeason: clock.calendar?.dayOfSeason ?? ((clock.calendarDay - 1) % DAYS_PER_SEASON) + 1,
    year: clock.calendar?.year ?? 1,
    weatherLabelVi: clock.weather.labelVi,
    weatherPerkVi: clock.weather.perkVi,
    recommendedSeedSkus,
  };
}
