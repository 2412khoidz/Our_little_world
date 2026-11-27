import type { DonorFishingSpotId } from './donorFishingSpots';
import type { TidefallFishRarity } from './tidefall-phaser/tidefallFishCatalog';
import type { TidefallFishingPhase } from './tidefall-phaser/tidefallFishingFsm';

/** Couple-visible fishing session on Dev LAN (same world = same spot state). */
export interface DonorFishSessionView {
  readonly spotId: DonorFishingSpotId;
  readonly previewName: string;
  readonly phase: TidefallFishingPhase;
  readonly progressPermille: number;
  readonly pointerNorm: number;
  readonly targetCenter?: number;
  readonly targetWidth?: number;
  readonly pointerDir?: number;
  readonly pointerSpeed?: number;
  readonly labelVi?: string;
  readonly rarity?: TidefallFishRarity;
  readonly spriteUrl?: string;
  readonly escaped?: boolean;
  readonly anglerUserId: string;
  readonly updatedAtMs: number;
}