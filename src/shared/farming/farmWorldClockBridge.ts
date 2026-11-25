import type { WorldClockPresentation } from '../world/worldClock';
import { FARM_SHOP_SEED_SKUS } from './farmShipping';

/**
 * Presentation seasons derived from WorldClock calendar day (Farm Rai 14-day seasons @ 2bbb65c pattern).
 * Does not alter growth authority — server farm clock remains source of truth.
 */
export type FarmPresentationSeason = 'hot' | 'rainy' | 'cool';

export const FARM_SEASON_LABEL_VI: Record<FarmPresentationSeason, string> = {
  hot: 'Mùa nóng',
  rainy: 'Mùa mưa',
  cool: 'Mùa mát',
};

const DAYS_PER_SEASON = 14;

export function farmSeasonForCalendarDay(calendarDay: number): FarmPresentationSeason {
  const slot = Math.floor((Math.max(1, calendarDay) - 1) / DAYS_PER_SEASON) % 3;
  if (slot === 0) return 'hot';
  if (slot === 1) return 'rainy';
  return 'cool';
}

/** OLW seed SKUs ↔ donor season matrix (Rai balance narrowed to current farm catalog). */
const SEED_SEASONS: Record<string, readonly FarmPresentationSeason[]> = {
  seed_wheat: ['hot', 'rainy', 'cool'],
  seed_carrot: ['rainy', 'cool'],
  seed_tomato: ['cool'],
  seed_strawberry: ['cool', 'hot'],
};

export function farmSeedRecommendedThisSeason(seedSku: string, season: FarmPresentationSeason): boolean {
  const allowed = SEED_SEASONS[seedSku];
  if (!allowed) return true;
  return allowed.includes(season);
}

export interface FarmWorldClockFarmContext {
  season: FarmPresentationSeason;
  seasonLabelVi: string;
  calendarDay: number;
  weatherLabelVi: string;
  recommendedSeedSkus: readonly string[];
}

export function farmContextFromWorldClock(clock: WorldClockPresentation): FarmWorldClockFarmContext {
  const season = farmSeasonForCalendarDay(clock.calendarDay);
  const recommendedSeedSkus = FARM_SHOP_SEED_SKUS.filter((sku) =>
    farmSeedRecommendedThisSeason(sku, season),
  );
  return {
    season,
    seasonLabelVi: FARM_SEASON_LABEL_VI[season],
    calendarDay: clock.calendarDay,
    weatherLabelVi: clock.weather.labelVi,
    recommendedSeedSkus,
  };
}