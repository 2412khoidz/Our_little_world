/**
 * Smooth 60 FPS spectator state interpolation for ChillFishingModal (pure TS, no DOM/React/Phaser).
 */
import type {
  TidefallFishingPhase,
  TidefallFishingState,
} from './tidefallFishingFsm';

export interface SpectatorFishingTarget {
  readonly phase: TidefallFishingPhase;
  readonly progress: number;
  readonly pointerNorm: number;
  readonly targetCenter?: number;
  readonly targetWidth?: number;
  readonly pointerDir?: number;
  readonly pointerSpeed?: number;
}

function clamp01(v: number, fallback: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
}

export function stepSpectatorFishingState(
  current: TidefallFishingState,
  target: SpectatorFishingTarget,
  dtSec: number,
): TidefallFishingState {
  const dt = Math.max(0, Math.min(0.05, dtSec));
  const elapsedMs = current.elapsedMs + dt * 1000;
  const phaseChanged = current.phase !== target.phase;
  const nextPhase = target.phase;

  const targetWidth =
    typeof target.targetWidth === 'number' && Number.isFinite(target.targetWidth)
      ? Math.max(0.08, Math.min(0.6, target.targetWidth))
      : current.targetWidth;
  const pointerSpeed =
    typeof target.pointerSpeed === 'number' && Number.isFinite(target.pointerSpeed)
      ? Math.max(0.2, Math.min(4, target.pointerSpeed))
      : current.pointerSpeed;

  let bobberDip: number;
  if (nextPhase === 'casting') {
    const t = Math.min(1, (phaseChanged ? 0 : elapsedMs) / 520);
    bobberDip = Math.sin(t * Math.PI) * 0.15;
  } else if (nextPhase === 'waiting') {
    bobberDip = 0.04 + Math.sin(elapsedMs * 0.004) * 0.03;
  } else if (nextPhase === 'bite') {
    bobberDip = 0.28 + Math.sin(elapsedMs * 0.012) * 0.08;
  } else {
    bobberDip = phaseChanged ? 0 : current.bobberDip * Math.exp(-10 * dt);
  }

  let pointerDir =
    target.pointerDir === -1 || target.pointerDir === 1
      ? target.pointerDir
      : current.pointerDir;

  let pointerNorm = clamp01(target.pointerNorm, current.pointerNorm);
  let progress = clamp01(target.progress, current.progress);
  let targetCenter = clamp01(target.targetCenter ?? current.targetCenter, current.targetCenter);

  if (nextPhase === 'minigame') {
    const blendFast = 1 - Math.exp(-16 * dt);
    const blendMed = 1 - Math.exp(-14 * dt);

    if (phaseChanged) {
      pointerNorm = Math.max(0.04, Math.min(0.96, pointerNorm));
      progress = clamp01(target.progress, 0.5);
      targetCenter = clamp01(target.targetCenter ?? 0.5, 0.5);
    } else {
      // Extrapolate pointer motion smoothly between network keyframes, then softly converge to target.
      let predicted = current.pointerNorm + pointerDir * pointerSpeed * 0.55 * dt;
      if (predicted >= 0.96) {
        predicted = 0.96;
        pointerDir = -1;
      } else if (predicted <= 0.04) {
        predicted = 0.04;
        pointerDir = 1;
      }
      const desiredPointer = Math.max(0.04, Math.min(0.96, target.pointerNorm));
      pointerNorm = Math.max(
        0.04,
        Math.min(0.96, predicted + (desiredPointer - predicted) * blendFast),
      );
      progress = clamp01(
        current.progress + (clamp01(target.progress, current.progress) - current.progress) * blendMed,
        progress,
      );
      targetCenter = clamp01(
        current.targetCenter +
          (clamp01(target.targetCenter ?? current.targetCenter, current.targetCenter) -
            current.targetCenter) *
            blendMed,
        targetCenter,
      );
    }
  } else if (nextPhase === 'idle') {
    pointerNorm = 0.12;
    progress = 0.5;
  }

  return {
    ...current,
    phase: nextPhase,
    elapsedMs: phaseChanged && nextPhase === 'casting' ? 0 : elapsedMs,
    progress,
    pointerNorm,
    pointerDir,
    pointerSpeed,
    targetCenter,
    targetWidth,
    bobberDip,
    hookFlash: nextPhase === 'bite' ? elapsedMs % 800 < 240 : false,
  };
}
