/**
 * Runtime gate for donor farm/fish world UI on integrated preview builds.
 * Production Supabase stays off; Dev LAN + optional VITE flag enables J-key loop without Dev menu.
 */

import { isDonorEconomyBuildDefault } from '../../lib/olwPreviewProfile';

let devLanDonorUiActive = false;

/** Call when React shell knows the active backend (e.g. dev-lan preview host). */
export function setDevLanDonorUiActive(active: boolean): void {
  devLanDonorUiActive = active;
}

export function isDonorEconomyUiEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (isDonorEconomyBuildDefault()) return true;
  return devLanDonorUiActive;
}

export function isDonorLanPlayableMode(backendMode: string): boolean {
  return backendMode === 'dev-lan' && isDonorEconomyUiEnabled();
}