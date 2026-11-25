/** Donor fishing locations — distinct biome tables + minigame engines (no duplicate weak rules). */
export type DonorFishingSpotId = 'meadow_pond' | 'east_stream';

export type DonorFishingMinigame = 'chill_reel' | 'tension_reel';

export interface DonorFishingSpotDef {
  readonly id: DonorFishingSpotId;
  readonly labelVi: string;
  readonly minigame: DonorFishingMinigame;
  readonly biome: 'pond' | 'stream';
}

export const DONOR_FISHING_SPOTS: Record<DonorFishingSpotId, DonorFishingSpotDef> = {
  meadow_pond: {
    id: 'meadow_pond',
    labelVi: 'Ao Meadowbrook (chill reel)',
    minigame: 'chill_reel',
    biome: 'pond',
  },
  east_stream: {
    id: 'east_stream',
    labelVi: 'Suối phía Đông (tension reel)',
    minigame: 'tension_reel',
    biome: 'stream',
  },
};

export function parseDonorFishingSpot(raw: unknown): DonorFishingSpotId {
  const id = String(raw ?? 'meadow_pond');
  if (id === 'east_stream' || id === 'meadow_pond') return id;
  return 'meadow_pond';
}