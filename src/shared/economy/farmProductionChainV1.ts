/**
 * V0.2 farming production chain v1 — typed domain sketch for RPC/UI alignment.
 * No React/Phaser imports. Catalog prices remain authoritative in `catalogConfig`.
 */

import { FARM_STARTER_SEED_QTY, FARM_STARTER_TOOLS } from '../farming/serverApply';
import {
  FARM_SELLABLE_PANTRY_SKUS,
  FARM_SHOP_PANTRY_SKUS,
  FARM_SHOP_SEED_SKUS,
} from '../farming/farmShipping';
import { FARM_PANTRY_PROCESSABLE_SKUS } from '../farming/farmPantryProcessing';
import { FARM_STATE_CONTRACT_VERSION, FARM_STATE_PLOT_BINDING } from '../farming/farmAuthorityConstants';
import { FARM_CONTRACT_PLOT_COUNT } from './sim/plotCount';

export const FARM_PRODUCTION_CHAIN_VERSION = '1.1.0' as const;

export type FarmProductionStepId =
  | 'acquire_seed'
  | 'acquire_pantry_supply'
  | 'till'
  | 'plant'
  | 'water'
  | 'harvest'
  | 'process_pantry'
  | 'sell_ship'
  | 'wallet_credit';

export interface FarmProductionStep {
  readonly id: FarmProductionStepId;
  readonly labelVi: string;
  /** Dev LAN / Supabase authority surface */
  readonly authority: 'shop_npc' | 'farm_apply' | 'farm_sell' | 'farm_ship' | 'farm_process' | 'wallet';
  readonly clientHotbar: boolean;
}

export const FARM_PRODUCTION_CHAIN_V1_STEPS: readonly FarmProductionStep[] = [
  { id: 'acquire_seed', labelVi: 'Mua hạt (Bác Hai)', authority: 'shop_npc', clientHotbar: true },
  { id: 'acquire_pantry_supply', labelVi: 'Mua đường / gia vị', authority: 'shop_npc', clientHotbar: false },
  { id: 'till', labelVi: 'Cuốc đất', authority: 'farm_apply', clientHotbar: true },
  { id: 'plant', labelVi: 'Gieo hạt', authority: 'farm_apply', clientHotbar: true },
  { id: 'water', labelVi: 'Tưới', authority: 'farm_apply', clientHotbar: true },
  { id: 'harvest', labelVi: 'Thu hoạch', authority: 'farm_apply', clientHotbar: true },
  { id: 'process_pantry', labelVi: 'Chế biến ở chuồng', authority: 'farm_process', clientHotbar: false },
  { id: 'sell_ship', labelVi: 'Gửi thùng đêm (Shipping Bin)', authority: 'farm_ship', clientHotbar: false },
  { id: 'wallet_credit', labelVi: 'Nhận xu vào ví', authority: 'wallet', clientHotbar: false },
] as const;

export interface FarmProductionChainV1Document {
  readonly version: typeof FARM_PRODUCTION_CHAIN_VERSION;
  readonly contractVersion: typeof FARM_STATE_CONTRACT_VERSION;
  readonly plotBinding: typeof FARM_STATE_PLOT_BINDING;
  readonly plotCount: number;
  readonly starterToolSkus: readonly string[];
  readonly starterSeedSku: 'seed_wheat';
  readonly starterSeedQty: typeof FARM_STARTER_SEED_QTY;
  readonly shopSeedSkus: readonly string[];
  readonly shopPantrySkus: readonly string[];
  readonly pantryRecipeSkus: readonly string[];
  readonly sellablePantrySkus: readonly string[];
  readonly steps: typeof FARM_PRODUCTION_CHAIN_V1_STEPS;
}

/** Read-only chain document for handover, sim, and SQL parity reviews. */
export function buildFarmProductionChainV1(): FarmProductionChainV1Document {
  return {
    version: FARM_PRODUCTION_CHAIN_VERSION,
    contractVersion: FARM_STATE_CONTRACT_VERSION,
    plotBinding: FARM_STATE_PLOT_BINDING,
    plotCount: FARM_CONTRACT_PLOT_COUNT,
    starterToolSkus: [...FARM_STARTER_TOOLS],
    starterSeedSku: 'seed_wheat',
    starterSeedQty: FARM_STARTER_SEED_QTY,
    shopSeedSkus: [...FARM_SHOP_SEED_SKUS],
    shopPantrySkus: [...FARM_SHOP_PANTRY_SKUS],
    pantryRecipeSkus: [...FARM_PANTRY_PROCESSABLE_SKUS],
    sellablePantrySkus: [...FARM_SELLABLE_PANTRY_SKUS],
    steps: FARM_PRODUCTION_CHAIN_V1_STEPS,
  };
}