/**
 * Cabacos / Sunnyside-lineage player strip layout (reference — not primary 8-dir gameplay rig).
 * @see vendor/farming-simulator-cabacos-upstream/src/game/scenes/Preloader.ts
 */
export const CABACOS_PLAYER_SPRITE = {
  upstreamSha: '79e423defc12bd99327cfcc28bf7ec0085996244',
  frameWidth: 96,
  frameHeight: 64,
  idle: { strip: 'base_waiting_strip9.png', frames: 9, frameRate: 9 },
  walk: { strip: 'base_walk_strip8.png', frames: 8, frameRate: 8 },
  locomotion: 'flipX' as const,
  assetBase: '/assets/donor/cabacos-characters',
} as const;

export const CABACOS_PLAYER_SPRITE_REJECT_REASON =
  'Cabacos human strip is 4-way + flipX only — OLW gameplay bans diagonal alpha composite; use Puny 8-dir sheets.';