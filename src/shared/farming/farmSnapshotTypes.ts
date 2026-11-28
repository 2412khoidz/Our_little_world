import type { CropSku, Farm, QualityTier } from './types';
import type { FertilizerSku, SprinklerSku } from './deepCropSimulation';
import type { WorldCalendarState } from '../world/worldCalendar';
import type { WeatherDef } from '../donor/webfarmville-c420bc2/weatherRules';

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
  /** Cabacos/Greens growth frame 0–3 (null when empty fallow). */
  growthStage: number | null;
  /** Deep farming plot extensions */
  fertilizer?: FertilizerSku | null;
  sprinkler?: SprinklerSku | null;
  greenhouse?: boolean;
  autoWatered?: boolean;
  seasonMatch?: boolean;
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
  /** Shared persistent calendar & weather snapshot for UI HUD / deep crop timing. */
  calendar?: WorldCalendarState;
  weather?: WeatherDef;
  farmingLevel?: number;
}

export interface FarmApplyParams {
  worldId: string;
  plotIndex: number;
  action:
    | 'till'
    | 'plant'
    | 'water'
    | 'harvest'
    | 'fertilize'
    | 'place_sprinkler'
    | 'remove_sprinkler';
  seedSku?: string | null;
  fertilizerSku?: FertilizerSku | null;
  sprinklerSku?: SprinklerSku | null;
  toolSku?: string | null;
  physicalSource?: { index: number; stackId: string };
  useEnvironment?: boolean;
  idempotencyKey: string;
  /** Optimistic concurrency — must match server farm row version. */
  farmVersion?: number;
}

export interface FarmApplyResult {
  snapshot: FarmSnapshot;
  harvested?: { sku: string; qty: number; quality: QualityTier }[];
}
