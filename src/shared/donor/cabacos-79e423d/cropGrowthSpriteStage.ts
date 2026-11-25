/**
 * Transplanted from Cabacos `src/game/data/ItemData.ts` + `FarmingSystem.ts` @ 79e423d —
 * 3 `stageGrowthDays` frames + ripe (frame index 3 on wheat spritesheet).
 * Presentation only: stage comes from OLW `growthPermille` / `FarmPlotView.growthStage`.
 */
export const CABACOS_UPSTREAM_SHA = '79e423defc12bd99327cfcc28bf7ec0085996244' as const;

export const CABACOS_WHEAT_SPRITE = {
  textureKey: 'donor-cabacos-wheat',
  frameWidth: 13,
  frameHeight: 16,
  ripeFrame: 3,
} as const;

export function cabacosFrameForGrowthStage(stage: number | null | undefined, ready: boolean): number {
  if (ready) return CABACOS_WHEAT_SPRITE.ripeFrame;
  if (stage == null) return 0;
  return Math.min(CABACOS_WHEAT_SPRITE.ripeFrame, Math.max(0, stage));
}