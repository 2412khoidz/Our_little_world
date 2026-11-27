import { gameAudio } from '../audio/gameAudioManager';
import type { DonorToolKind } from './donorPydewToolController';

/** Plays real vendored tool/farming SFX through the unified GameAudioManager. */
export function playToolActionSfx(kind: DonorToolKind): void {
  gameAudio.playSfx(kind, {
    volumeScale: kind === 'plant' || kind === 'harvest' ? 0.92 : 0.88,
    rateJitter: 0.06,
  });
}
