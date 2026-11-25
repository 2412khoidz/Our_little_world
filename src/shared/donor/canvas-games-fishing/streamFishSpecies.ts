/**
 * Stream biome table vendored from `data/fish.ts` @ forinda/canvas-games (MIT).
 * OLW uses trout/salmon slice for Demo E east stream (not pond Meadowbrook table).
 */
export type CanvasStreamRarity = 'common' | 'uncommon' | 'rare';

export interface CanvasStreamFish {
  readonly id: string;
  readonly name: string;
  readonly rarity: CanvasStreamRarity;
  readonly weight: number;
  readonly fight: number;
  readonly olwSku: string;
}

/** Copied species rows — weights/fight from donor. */
export const CANVAS_STREAM_FISH: readonly CanvasStreamFish[] = [
  { id: 'trout', name: 'Trout', rarity: 'common', weight: 25, fight: 0.2, olwSku: 'donor_trout_stream' },
  { id: 'salmon', name: 'Salmon', rarity: 'uncommon', weight: 12, fight: 0.35, olwSku: 'donor_trout_stream' },
  { id: 'bass', name: 'Bass', rarity: 'common', weight: 25, fight: 0.25, olwSku: 'carp_pond' },
];

export function pickCanvasStreamFish(rng01: () => number, castDistance = 0.55): CanvasStreamFish {
  const boosted = CANVAS_STREAM_FISH.map((f) => {
    let w = f.weight;
    if (f.rarity === 'uncommon') w *= 1 + castDistance * 1.5;
    return { fish: f, w };
  });
  const total = boosted.reduce((s, b) => s + b.w, 0);
  let roll = rng01() * total;
  for (const b of boosted) {
    roll -= b.w;
    if (roll <= 0) return b.fish;
  }
  return CANVAS_STREAM_FISH[0]!;
}