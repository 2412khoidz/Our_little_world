/**
 * Transplanted from `fernforge-arcade/greens` @ 3f32fd8903b2c47fd2b05a529d0652c1b789e0b6
 * Original source: src/game/systems/skills.js
 * SPDX-License-Identifier: MIT
 */

export const GREENS_MAX_SKILL_LEVEL = 10;
export const GREENS_SKILL_IDS = ["farming","foraging","mining","combat","fishing","cooking"] as const;
export type GreensSkillId = (typeof GREENS_SKILL_IDS)[number];
export const GREENS_SKILL_NAMES = {
  "farming": "Farming",
  "foraging": "Foraging",
  "mining": "Mining",
  "combat": "Combat",
  "fishing": "Fishing",
  "cooking": "Cooking"
} as const;

export function xpForGreensSkillLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.round(50 * Math.pow(level, 1.8));
}

export function levelForGreensSkillXp(xp: number): number {
  let lv = 0;
  while (lv < GREENS_MAX_SKILL_LEVEL && xp >= xpForGreensSkillLevel(lv + 1)) {
    lv += 1;
  }
  return lv;
}
