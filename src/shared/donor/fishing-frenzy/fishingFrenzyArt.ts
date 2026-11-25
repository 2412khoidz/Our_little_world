import type { TidefallFishingPhase } from '../tidefall-phaser/tidefallFishingFsm';
import {
  FISHING_FRENZY_BOBBER,
  FISHING_FRENZY_ROD,
  fishingFrenzyFisherSrc,
  type FishingFrenzyFisherPhase,
} from './fishingFrenzySpriteMap';

export interface FishingFrenzyArtBundle {
  readonly fisherIdle: HTMLImageElement;
  readonly fisherCast: HTMLImageElement;
  readonly fisherReel: HTMLImageElement;
  readonly bobber: HTMLImageElement;
  readonly rod: HTMLImageElement;
  readonly fishSprites: Map<string, HTMLImageElement>;
}

let loadPromise: Promise<FishingFrenzyArtBundle> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được ảnh fishing-frenzy: ${src}`));
    img.src = src;
  });
}

export function tidefallPhaseToFisherPhase(phase: TidefallFishingPhase): FishingFrenzyFisherPhase {
  if (phase === 'casting') return 'cast';
  if (phase === 'minigame' || phase === 'landed' || phase === 'escaped') return 'reel';
  return 'idle';
}

export function fisherImageForPhase(bundle: FishingFrenzyArtBundle, phase: TidefallFishingPhase): HTMLImageElement {
  const fp = tidefallPhaseToFisherPhase(phase);
  if (fp === 'cast') return bundle.fisherCast;
  if (fp === 'reel') return bundle.fisherReel;
  return bundle.fisherIdle;
}

export function loadFishingFrenzyArt(extraFishPaths: readonly string[] = []): Promise<FishingFrenzyArtBundle> {
  if (loadPromise && extraFishPaths.length === 0) return loadPromise;

  const fishPaths = [...new Set(extraFishPaths)];
  const run = Promise.all([
    loadImage(fishingFrenzyFisherSrc('idle')),
    loadImage(fishingFrenzyFisherSrc('cast')),
    loadImage(fishingFrenzyFisherSrc('reel')),
    loadImage(FISHING_FRENZY_BOBBER),
    loadImage(FISHING_FRENZY_ROD),
    ...fishPaths.map((p) => loadImage(p)),
  ]).then(([fisherIdle, fisherCast, fisherReel, bobber, rod, ...fishImgs]) => {
    const fishSprites = new Map<string, HTMLImageElement>();
    fishPaths.forEach((p, i) => fishSprites.set(p, fishImgs[i]!));
    return { fisherIdle, fisherCast, fisherReel, bobber, rod, fishSprites };
  });

  if (extraFishPaths.length === 0) {
    loadPromise = run;
  }
  return run;
}