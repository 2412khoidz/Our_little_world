/** DEV-only telemetry for Living Pet acceptance (E2E + owner). Stripped in prod guard via marker string. */
export const LIVING_PET_TELEMETRY_TEST_ID = 'living-pet-telemetry';

export interface LivingPetDevTelemetry {
  visible: boolean;
  mapId: string;
  x: number;
  y: number;
  animState: string;
  brainPhase: string;
  lastIntent: string;
  locomotionKind: string;
  foodOfferHandled: boolean;
  sampleMs: number;
}

export function emptyLivingPetDevTelemetry(): LivingPetDevTelemetry {
  return {
    visible: false,
    mapId: 'home',
    x: 0,
    y: 0,
    animState: 'sleep',
    brainPhase: 'idle',
    lastIntent: 'rest',
    locomotionKind: 'idle',
    foodOfferHandled: false,
    sampleMs: 0,
  };
}