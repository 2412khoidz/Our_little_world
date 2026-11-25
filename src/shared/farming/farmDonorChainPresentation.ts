/**
 * Donor-aligned production chain copy (Rai Larn Na · PyDew · Harvest Duo · OLW PRODUCTION_CHAINS).
 * Presentation-only; economy authority stays catalog + workshop/shipping RPCs.
 */

export type FarmChainDonorRef = 'rai_larn_na' | 'pydew' | 'harvest_duo' | 'olw';

export interface FarmChainStepVi {
  donor: FarmChainDonorRef;
  labelVi: string;
}

/** Core crop loop shown in farm market / shipping headers during recovery. */
export const FARM_CROP_CHAIN_STEPS_VI: readonly FarmChainStepVi[] = [
  { donor: 'rai_larn_na', labelVi: 'Hạt (chợ / Bác Hai)' },
  { donor: 'olw', labelVi: 'Trồng → tưới (ruộng)' },
  { donor: 'pydew', labelVi: 'Thu hoạch chất lượng' },
  { donor: 'harvest_duo', labelVi: 'Thùng giao / bếp donor' },
] as const;

export function formatFarmChainSummaryVi(): string {
  return FARM_CROP_CHAIN_STEPS_VI.map((s) => s.labelVi).join(' → ');
}