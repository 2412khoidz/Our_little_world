/**
 * C3 prep: donor preview SKUs and interactable ids that must stay aligned with
 * `farmPlotContract` + main-game farm slice when Cabacos farm tiles replace procedural farm.
 * No runtime imports from donor donors here — list only for integration checklist.
 */
import { FARM_PLOT_CONTRACT_VERSION } from '../../world/farmPlotContract';

/** Dev LAN / donor modal outputs — promote via catalog fingerprint change, not silent alias. */
export const DONOR_PREVIEW_SKUS = [
  'wheat',
  'flour',
  'donor_bread',
  'chicken_feed',
  'donor_egg',
  'carp_pond',
  'donor_trout_stream',
] as const;

export type DonorPreviewSku = (typeof DONOR_PREVIEW_SKUS)[number];

/** Interactable ids wired for donor economy preview (remap when Tiled farm import lands). */
export const DONOR_FARM_INTERACTABLE_IDS = {
  millWorkshop: 'farm_barn_mill',
  seedShop: 'farm_seed_shop',
  streamFishingOutdoor: 'outdoor_stream',
  pondFishingOutdoor: 'outdoor_fishing',
} as const;

export const C3_FARM_DONOR_ALIGNMENT = {
  farmPlotContractVersion: FARM_PLOT_CONTRACT_VERSION,
  donorPreviewSkus: DONOR_PREVIEW_SKUS,
  interactables: DONOR_FARM_INTERACTABLE_IDS,
  /** Owner gate — do not remap plots until Cabacos village render P0 is green. */
  blockedByP0Render: true as const,
};