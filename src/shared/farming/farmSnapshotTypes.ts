import type { CropSku, Farm, QualityTier } from './types';

export interface FarmPlotView {
  plotId: number;
  soil: 'empty' | 'tilled' | 'planted';
  cropSku: CropSku | null;
  plantedAtMs: number | null;
  waterCount: number;
  growthPermille: number;
  ready: boolean;
}

export interface FarmSnapshot {
  worldId: string;
  version: number;
  serverNowMs: number;
  farm: Farm;
  plots: readonly FarmPlotView[];
  walletCoins: number;
}

export interface FarmApplyParams {
  worldId: string;
  plotIndex: number;
  action: 'till' | 'plant' | 'water' | 'harvest';
  seedSku?: string | null;
  idempotencyKey: string;
}

export interface FarmApplyResult {
  snapshot: FarmSnapshot;
  harvested?: { sku: string; qty: number; quality: QualityTier }[];
}