import type { DonorFishingSpotId } from './donorFishingSpots';
import type { TidefallFishingPhase } from './tidefall-phaser/tidefallFishingFsm';

/** Couple-visible fishing session on Dev LAN (same world = same spot state). */
export interface DonorFishSessionView {
  readonly spotId: DonorFishingSpotId;
  readonly previewName: string;
  readonly phase: TidefallFishingPhase;
  readonly progressPermille: number;
  readonly pointerNorm: number;
  readonly anglerUserId: string;
  readonly updatedAtMs: number;
}