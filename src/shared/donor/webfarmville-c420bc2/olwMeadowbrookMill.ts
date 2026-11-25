/**
 * OLW barn windmill recipes — Meadowbrook Windmill rules, OLW catalog SKUs.
 * Donor recipe shape from `shared/src/content/buildings.ts#mill` @ c420bc2.
 */
import type { BuildingDef } from './content/buildingsTypes';

export const OLW_MEADOWBROOK_MILL: BuildingDef = {
  id: 'olw_barn_mill',
  name: 'Cối xay chuồng',
  level: 1,
  cost: 0,
  slots: 3,
  recipes: [
    {
      id: 'olw_flour',
      output: 'flour',
      qty: 1,
      inputs: { wheat: 2 },
      craftSec: 45,
      xp: 2,
    },
    {
      id: 'olw_strawberry_jam',
      output: 'strawberry_jam',
      qty: 1,
      inputs: { strawberry: 2, sugar_pack: 1 },
      craftSec: 45,
      xp: 3,
    },
  ],
};