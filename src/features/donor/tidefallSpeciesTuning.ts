import { pickPersonality, type TidefallFishPersonality } from '../../shared/donor/tidefall-phaser/tidefallFishingFsm';
import type { TidefallFishEntry } from '../../shared/donor/tidefall-phaser/tidefallFishCatalog';

export function speciesParamsForFish(
  fish: TidefallFishEntry | null,
  rng: () => number,
): {
  personality: TidefallFishPersonality;
  targetWidth: number;
  pointerSpeed: number;
  targetDriftAmp: number;
  targetDriftFreq: number;
  speedSurgeAmp: number;
  hitGain: number;
  missPenalty: number;
  biteWindowMs: number;
} {
  if (!fish) {
    const fallbackP = pickPersonality(rng);
    return {
      personality: fallbackP,
      targetWidth: fallbackP === 'LEGENDARY' ? 0.19 : fallbackP === 'TIMID' ? 0.36 : 0.3,
      pointerSpeed: fallbackP === 'AGGRESSIVE' ? 1.48 : 1.25,
      targetDriftAmp: fallbackP === 'LEGENDARY' ? 0.16 : 0.05,
      targetDriftFreq: 1.5,
      speedSurgeAmp: fallbackP === 'LEGENDARY' ? 0.18 : 0,
      hitGain: 0.18,
      missPenalty: 0.11,
      biteWindowMs: 5200,
    };
  }
  switch (fish.rarity) {
    case 'legendary':
      return {
        personality: 'LEGENDARY',
        targetWidth: 0.17,
        pointerSpeed: 1.98,
        targetDriftAmp: 0.2,
        targetDriftFreq: 2.5,
        speedSurgeAmp: 0.22,
        hitGain: 0.13,
        missPenalty: 0.14,
        biteWindowMs: 3200,
      };
    case 'epic':
      return {
        personality: 'AGGRESSIVE',
        targetWidth: 0.21,
        pointerSpeed: 1.72,
        targetDriftAmp: 0.15,
        targetDriftFreq: 2.1,
        speedSurgeAmp: 0.14,
        hitGain: 0.15,
        missPenalty: 0.13,
        biteWindowMs: 3800,
      };
    case 'rare':
      return {
        personality: 'AGGRESSIVE',
        targetWidth: 0.25,
        pointerSpeed: 1.5,
        targetDriftAmp: 0.11,
        targetDriftFreq: 1.65,
        speedSurgeAmp: 0.08,
        hitGain: 0.16,
        missPenalty: 0.12,
        biteWindowMs: 4400,
      };
    case 'uncommon':
      return {
        personality: 'NORMAL',
        targetWidth: 0.31,
        pointerSpeed: 1.28,
        targetDriftAmp: 0.06,
        targetDriftFreq: 1.2,
        speedSurgeAmp: 0,
        hitGain: 0.19,
        missPenalty: 0.11,
        biteWindowMs: 5200,
      };
    default:
      return {
        personality: 'TIMID',
        targetWidth: 0.38,
        pointerSpeed: 1.06,
        targetDriftAmp: 0,
        targetDriftFreq: 1.0,
        speedSurgeAmp: 0,
        hitGain: 0.22,
        missPenalty: 0.09,
        biteWindowMs: 6000,
      };
  }
}
