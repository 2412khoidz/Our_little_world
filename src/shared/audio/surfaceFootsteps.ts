import type { MapId } from '../types';

export type SurfaceFootstepKind = 'grass' | 'soil' | 'sand' | 'wood' | 'stone' | 'water';

export type SurfaceFootstepSfx =
  | 'footstep_grass'
  | 'footstep_soil'
  | 'footstep_sand'
  | 'footstep_wood'
  | 'footstep_stone'
  | 'footstep_water';

/**
 * Pure map/tile surface resolver selecting acoustic footsteps by biome & floor zone.
 */
export function resolveFootstepSurface(params: {
  mapId: MapId;
  tileX: number;
  tileY: number;
  isFarmPlotTile?: boolean;
}): SurfaceFootstepKind {
  const { mapId, tileX, tileY, isFarmPlotTile } = params;

  if (
    mapId === 'home' ||
    mapId === 'shop' ||
    mapId === 'shop_seed' ||
    mapId === 'shop_tool' ||
    mapId === 'shop_crop_market' ||
    mapId === 'shop_town_hall'
  ) {
    return 'wood';
  }

  if (mapId === 'garden') {
    if (tileX >= 7 && tileX <= 8 && tileY >= 9 && tileY <= 10) return 'wood';
    if (
      (tileX >= 7 && tileX <= 9 && tileY >= 3 && tileY <= 8) ||
      (tileY === 6 && tileX >= 4 && tileX <= 11)
    ) {
      return 'stone';
    }
    return 'grass';
  }

  if (mapId === 'farm') {
    if (isFarmPlotTile) return 'soil';
    if (tileX >= 31 && tileX <= 36 && tileY >= 8 && tileY <= 11) return 'water';
    if (tileX >= 10 && tileX <= 14 && tileY >= 8 && tileY <= 10) return 'wood';
    return 'grass';
  }

  if (mapId === 'beach') {
    if (tileX >= 28 && tileY >= 14 && tileY <= 18) return 'wood';
    if (tileX >= 25 && tileX <= 28 && tileY >= 10 && tileY <= 30) return 'water';
    if (tileX >= 17) return 'sand';
    return 'grass';
  }

  if (mapId === 'village') {
    if (
      (tileX >= 6 && tileX <= 8 && tileY >= 11 && tileY <= 20) ||
      (tileX >= 10 && tileX <= 16 && tileY >= 18 && tileY <= 20) ||
      (tileX >= 36 && tileX <= 42 && tileY >= 31 && tileY <= 34) ||
      tileX >= 78
    ) {
      return 'wood';
    }
    if (tileX >= 71) return 'sand';
    if (tileX >= 26 && tileX <= 58 && tileY >= 24 && tileY <= 37) return 'stone';
    return 'grass';
  }

  if (mapId === 'forest') {
    if (tileX >= 17 && tileX <= 23 && tileY >= 12 && tileY <= 22) return 'water';
    if (tileX >= 11 && tileX <= 15) return 'soil';
    return 'grass';
  }

  return 'grass';
}

const SURFACE_SFX_BY_KIND: Readonly<Record<SurfaceFootstepKind, SurfaceFootstepSfx>> = {
  grass: 'footstep_grass',
  soil: 'footstep_soil',
  sand: 'footstep_sand',
  wood: 'footstep_wood',
  stone: 'footstep_stone',
  water: 'footstep_water',
};

export function footstepSfxForSurface(surface: SurfaceFootstepKind): SurfaceFootstepSfx {
  return SURFACE_SFX_BY_KIND[surface];
}
