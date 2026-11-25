/**
 * Farm plot count for economy simulator runs vs Composer 3 contract.
 */

import { enumerateFarmPlotAnchors } from '../../world/farmPlotContract.ts';
import type { SimProfile } from './types.ts';

export const FARM_CONTRACT_PLOT_COUNT = enumerateFarmPlotAnchors().length;

export const DEFAULT_SIM_FARM_PLOT_COUNT = 12;

/**
 * CLI: empty → default profile plotCount; `184`|`contract`|`full` → contract;
 * `sample:N` → stratified effective capacity of N plots (N ≤ contract);
 * positive integer → explicit override for farming profiles.
 */
export function parseSimPlotsArg(raw: string | undefined): number | undefined {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  if (lower === 'contract' || lower === 'full' || lower === '184') {
    return FARM_CONTRACT_PLOT_COUNT;
  }

  const sample = /^sample:(\d+)$/i.exec(trimmed);
  if (sample) {
    const n = Number.parseInt(sample[1]!, 10);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(n, FARM_CONTRACT_PLOT_COUNT);
    }
    return undefined;
  }

  const n = Number.parseInt(trimmed, 10);
  if (Number.isFinite(n) && n > 0) {
    return Math.min(n, FARM_CONTRACT_PLOT_COUNT);
  }
  return undefined;
}

export function applyPlotCountOverride(profile: SimProfile, override?: number): SimProfile {
  if (override == null || !profile.features.farming) {
    return profile;
  }
  return {
    ...profile,
    plotCount: override,
    labelVi: `${profile.labelVi} [plots=${override}]`,
  };
}

export function resolveSimProfile(profile: SimProfile, plotCountOverride?: number): SimProfile {
  return applyPlotCountOverride(profile, plotCountOverride);
}