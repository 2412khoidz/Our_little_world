/** Donor fishing locations — distinct biome tables + minigame engines (no duplicate weak rules). */
export type DonorFishingSpotId = 'meadow_pond' | 'east_stream' | 'gull_bay';

export type DonorFishingMinigame = 'tidefall_bar';

export interface DonorFishingSpotDef {
  readonly id: DonorFishingSpotId;
  readonly labelVi: string;
  readonly minigame: DonorFishingMinigame;
  readonly biome: 'pond' | 'stream';
}

export const DONOR_FISHING_SPOTS: Record<DonorFishingSpotId, DonorFishingSpotDef> = {
  meadow_pond: {
    id: 'meadow_pond',
    labelVi: 'Ao làng — câu cá',
    minigame: 'tidefall_bar',
    biome: 'pond',
  },
  east_stream: {
    id: 'east_stream',
    labelVi: 'Suối phía Đông — câu cá',
    minigame: 'tidefall_bar',
    biome: 'stream',
  },
  gull_bay: {
    id: 'gull_bay',
    labelVi: 'Bến Gull Bay — câu cá',
    minigame: 'tidefall_bar',
    biome: 'pond',
  },
};

export function parseDonorFishingSpot(raw: unknown): DonorFishingSpotId {
  const id = String(raw ?? 'meadow_pond');
  if (id === 'east_stream' || id === 'meadow_pond' || id === 'gull_bay') return id;
  return 'meadow_pond';
}