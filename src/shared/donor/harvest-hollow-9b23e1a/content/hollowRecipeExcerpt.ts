/**
 * Recipe rows copied from `shared/content/recipes.js` @ 9b23e1a (GENERATED header retained upstream).
 * SPDX-License-Identifier: MIT — Copyright Krasimir Kralev / Harvest Hollow contributors.
 */
export interface HollowRecipeRow {
  readonly id: string;
  readonly name: string;
  readonly building: string;
  readonly ms: number;
  readonly out: number;
  readonly inputs: Record<string, number>;
}

export const HOLLOW_BREAD_RECIPE: HollowRecipeRow = {
  id: 'bread',
  name: 'Bread',
  building: 'bakery',
  ms: 5 * 60_000,
  out: 1,
  inputs: { flour: 1 },
};

export const HOLLOW_CHICKEN_FEED_RECIPE: HollowRecipeRow = {
  id: 'chicken_feed',
  name: 'Chicken Feed',
  building: 'feed_mill',
  ms: 5 * 60_000,
  out: 6,
  inputs: { wheat: 3 },
};

export const HOLLOW_CHICKEN_DEF = {
  product: 'egg' as const,
  out: 1,
  cycleMs: 20 * 60_000,
  feedQty: 1,
  feedSku: 'chicken_feed',
} as const;