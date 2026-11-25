/**
 * Vendored from `shared/rules/economy.js` @ 9b23e1a (Harness Hollow / harvest-hollow).
 * SPDX-License-Identifier: MIT — Copyright Krasimir Kralev
 */
/** Basis-point share of an integer (floor). */
export const mulBp = (n: number, bp: number): number => Math.floor((n * bp) / 10_000);

/** Minimum craft duration floor (50 % of base) from `shared/content/boosts.js` GROWTH.timeFloorBp. */
export const GROWTH_TIME_FLOOR_BP = 5000;

/** Duration after time cuts; never below `GROWTH.timeFloorBp` of base. */
export function cutMs(base: number, bp: number): number {
  return base - mulBp(base, Math.min(bp, 10_000 - GROWTH_TIME_FLOOR_BP));
}