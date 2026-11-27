/**
 * Shared 4-season persistent game calendar for Our Little World.
 * Adapts Stardew / Greens (28 days/season × 4 seasons = 112-day year)
 * into deterministic OLW server-time progression (zero running cron/server required).
 */

export const CALENDAR_SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;
export type CalendarSeason = (typeof CALENDAR_SEASONS)[number];

export const DAYS_PER_SEASON = 28;
export const SEASONS_PER_YEAR = CALENDAR_SEASONS.length;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS_PER_YEAR;

/** Default real-time duration per in-game calendar day: 15 minutes (96 days/real day). */
export const DEFAULT_CALENDAR_DAY_MS = 15 * 60_000;

export const SEASON_LABEL_VI: Readonly<Record<CalendarSeason, string>> = {
  spring: 'Mùa Xuân',
  summer: 'Mùa Hè',
  fall: 'Mùa Thu',
  winter: 'Mùa Đông',
};

export const SEASON_SHORT_VI: Readonly<Record<CalendarSeason, string>> = {
  spring: 'Xuân',
  summer: 'Hè',
  fall: 'Thu',
  winter: 'Đông',
};

export interface WorldCalendarState {
  /** 1-based total elapsed game days since world epoch. */
  readonly totalDay: number;
  /** 1-based year count (1, 2, ...). */
  readonly year: number;
  /** Current season ID. */
  readonly season: CalendarSeason;
  /** Localized Vietnamese name ("Mùa Xuân", ...). */
  readonly seasonLabelVi: string;
  /** 0-based season index (0=spring..3=winter). */
  readonly seasonIndex: number;
  /** 1..28 day within current season. */
  readonly dayOfSeason: number;
  /** Elapsed milliseconds inside current game day. */
  readonly dayElapsedMs: number;
  /** Duration of one game day in milliseconds. */
  readonly dayDurationMs: number;
}

export function resolveWorldCalendar(
  nowMs: number,
  worldEpochMs = 0,
  dayDurationMs = DEFAULT_CALENDAR_DAY_MS,
): WorldCalendarState {
  const safeDuration = Math.max(1_000, Math.floor(dayDurationMs));
  const elapsed = Math.max(0, Math.floor(nowMs - worldEpochMs));
  const zeroDay = Math.floor(elapsed / safeDuration);
  const totalDay = zeroDay + 1;
  const year = Math.floor(zeroDay / DAYS_PER_YEAR) + 1;
  const dayInYear = zeroDay % DAYS_PER_YEAR;
  const seasonIndex = Math.floor(dayInYear / DAYS_PER_SEASON);
  const season = CALENDAR_SEASONS[seasonIndex] ?? 'spring';
  const dayOfSeason = (dayInYear % DAYS_PER_SEASON) + 1;
  const dayElapsedMs = elapsed % safeDuration;

  return {
    totalDay,
    year,
    season,
    seasonLabelVi: SEASON_LABEL_VI[season],
    seasonIndex,
    dayOfSeason,
    dayElapsedMs,
    dayDurationMs: safeDuration,
  };
}

export function formatCalendarDateVi(cal: WorldCalendarState): string {
  return `Ngày ${cal.dayOfSeason} ${cal.seasonLabelVi}, Năm ${cal.year}`;
}

export function daysElapsedRange(
  startMs: number,
  endMs: number,
  worldEpochMs = 0,
  dayDurationMs = DEFAULT_CALENDAR_DAY_MS,
): number {
  const startDay = resolveWorldCalendar(startMs, worldEpochMs, dayDurationMs).totalDay;
  const endDay = resolveWorldCalendar(Math.max(startMs, endMs), worldEpochMs, dayDurationMs).totalDay;
  return Math.max(0, endDay - startDay);
}
