import { FARM_PLOT_CONTRACT_VERSION } from '../world/farmPlotContract';
import { FARM_ANNEX_PLOT_COUNT, FARM_MAIN_PLOT_COUNT } from './farmPlotIndex';

/** Persisted with `world_farm_worlds.contract_version` — must match Composer 3 #12. */
export const FARM_STATE_CONTRACT_VERSION = FARM_PLOT_CONTRACT_VERSION;

/** Full contract grid: farm_main 0..119 + farm_annex 0..63 (184 plots). */
export const FARM_STATE_PLOT_BINDING =
  `farm_main:0-${FARM_MAIN_PLOT_COUNT - 1},farm_annex:0-${FARM_ANNEX_PLOT_COUNT - 1}` as const;