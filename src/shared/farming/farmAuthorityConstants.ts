import { FARM_PLOT_CONTRACT_VERSION } from '../world/farmPlotContract';
import { GARDEN_PLOT_COUNT } from './crops';

/** Persisted with `world_farm_worlds.contract_version` — must match Composer 3 #12. */
export const FARM_STATE_CONTRACT_VERSION = FARM_PLOT_CONTRACT_VERSION;

/** Dev LAN / Supabase slice: plot indices 0..23 → `farm_main_{n}` anchors. */
export const FARM_STATE_PLOT_BINDING = `farm_main:0-${GARDEN_PLOT_COUNT - 1}` as const;