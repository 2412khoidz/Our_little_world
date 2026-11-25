/**
 * OLW bakery + feed mill recipes — Harvest Hollow timings, OLW SKUs (dev seconds).
 */
import type { BuildingDef } from '../webfarmville-c420bc2/content/buildingsTypes';

export const OLW_HOLLOW_BAKERY: BuildingDef = {
  id: 'olw_hollow_bakery',
  name: 'Lò bánh Hollow',
  level: 1,
  cost: 0,
  slots: 2,
  recipes: [
    {
      id: 'olw_bread',
      output: 'donor_bread',
      qty: 1,
      inputs: { flour: 1 },
      craftSec: 40,
      xp: 6,
    },
    {
      id: 'olw_chicken_feed',
      output: 'chicken_feed',
      qty: 6,
      inputs: { wheat: 3 },
      craftSec: 25,
      xp: 1,
    },
  ],
};