import {
  createSelectionLog,
  createSwitchHistory,
  sanitizeStabilizationConfig,
  type CommitmentConfig,
  type SelectionLogState,
  type SwitchHistoryState,
} from '../petAdvanced/primitives/stabilization';

/** Default stabilization tuned to reduce ping-pong and hide_in_box spam. */
export const PET_BRAIN_STABILIZATION = sanitizeStabilizationConfig({
  minActionMs: 3500,
  commitmentMs: 8000,
  interruptGraceMs: 1200,
  hysteresisMargin01: 0.16,
  maxSwitches: 4,
  switchWindowMs: 20_000,
  minRepeatCooldownMs: 14_000,
});

export const PET_BRAIN_COMMITMENT: CommitmentConfig = {
  minActionMs: PET_BRAIN_STABILIZATION.minActionMs,
  commitmentMs: PET_BRAIN_STABILIZATION.commitmentMs,
  interruptGraceMs: PET_BRAIN_STABILIZATION.interruptGraceMs,
};

export const PET_BRAIN_AFFORDANCE_FILTER = {
  maxDistance: 420,
  requireReachable: true,
  allowOccupied: false,
} as const;

export function createDefaultBrainAux(): {
  selectionLog: SelectionLogState;
  switchHistory: SwitchHistoryState;
} {
  return {
    selectionLog: createSelectionLog(),
    switchHistory: createSwitchHistory(),
  };
}