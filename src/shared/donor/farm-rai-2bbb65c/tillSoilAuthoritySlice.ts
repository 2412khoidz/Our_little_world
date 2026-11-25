/**
 * Vendored pattern from Farm Rai Larn Na `src/rules/actions.ts` @ 2bbb65c8
 * (hoe on empty field → `tile.kind = 'tilled'`). OLW keeps till in `crops.till`;
 * this module documents the donor action shape for Wave 1 reuse evidence only.
 */
export const FARM_RAI_UPSTREAM_SHA = '2bbb65c8c7bcafeae0f70623ea57a2c86b4bb9ba' as const;

export type FarmRaiTileKind = 'grass' | 'tilled' | 'planted';

/** Donor equivalent: `tile.kind = 'tilled'` after successful hoe. */
export function farmRaiTillPresentationKind(before: FarmRaiTileKind): FarmRaiTileKind | null {
  if (before === 'grass') return 'tilled';
  return null;
}