import type { CropSku, Farm, QualityTier } from './types';

export interface FarmPlotView {
  plotId: number;
  soil: 'empty' | 'tilled' | 'planted';
  cropSku: CropSku | null;
  plantedAtMs: number | null;
  waterCount: number;
  growthPermille: number;
  ready: boolean;
  /** Wall-clock ETA for harvest when `soil === 'planted'`. */
  harvestReadyAtMs: number | null;
  /** Cabacos-style growth frame 0–3 (null when empty fallow). */
  growthStage: number | null;
}

export interface FarmSnapshot {
  worldId: string;
  version: number;
  serverNowMs: number;
  farm: Farm;
  plots: readonly FarmPlotView[];
  walletCoins: number;
  /** Dev LAN fast-grow only; 1 in production. */
  growthTimeScale?: number;
}

export interface FarmApplyParams {
  worldId: string;
  plotIndex: number;
  action: 'till' | 'plant' | 'water' | 'harvest';
  seedSku?: string | null;
  idempotencyKey: string;
  /** Optimistic concurrency — must match server farm row version. */
  farmVersion?: number;
}

export interface FarmApplyResult {
  snapshot: FarmSnapshot;
  harvested?: { sku: string; qty: number; quality: QualityTier }[];
}