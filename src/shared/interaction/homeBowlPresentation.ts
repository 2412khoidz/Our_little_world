/** Presentation bowl flags for main-game J actions (dev LAN until Mission 02 RPC). */

export interface HomeBowlPresentation {
  foodEmpty: boolean;
  foodFull: boolean;
  waterEmpty: boolean;
  waterFull: boolean;
}

export const DEFAULT_HOME_BOWL_PRESENTATION: HomeBowlPresentation = {
  foodEmpty: true,
  foodFull: false,
  waterEmpty: true,
  waterFull: false,
};

export function fillHomeFoodBowl(state: HomeBowlPresentation): HomeBowlPresentation {
  return { ...state, foodEmpty: false, foodFull: true };
}

export function pourHomeWaterBowl(state: HomeBowlPresentation): HomeBowlPresentation {
  return { ...state, waterEmpty: false, waterFull: true };
}

export function waterPitcherPourDelta(currentLevel: number, pourUnits = 35): number {
  return Math.max(0, currentLevel - pourUnits);
}

export function waterPitcherAfterFill(): number {
  return 100;
}