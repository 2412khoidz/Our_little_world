import { buildMovementCollisionGrid } from '../../placement';
import { TILE_SIZE } from '../../maps';
import type { FurniturePlacement, MapId } from '../../types';
import { PET_HOME_NAV_ANCHORS } from '../petMovement/petHomeNavLayout';
import type { AffordanceCandidate } from '../petPrimitivesAdapter';

export interface MainGamePetWorldHints {
  readonly mapId: MapId;
  readonly placements: readonly FurniturePlacement[];
  readonly petX: number;
  readonly petY: number;
  readonly bowlFoodPortions: number;
  readonly waterBowlVolume: number;
  readonly isStudying: boolean;
  readonly partnersSittingSofa: boolean;
}

function distancePx(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

const STATIC_HOME_PROPS: readonly {
  targetId: string;
  action: string;
  px: number;
  py: number;
  estimatedCostMs: number;
}[] = [
  { targetId: 'food_bowl', action: 'eat_bowl', px: 198, py: 162, estimatedCostMs: 3000 },
  { targetId: 'water_bowl', action: 'drink_bowl', px: 210, py: 162, estimatedCostMs: 2500 },
  { targetId: 'pet_bed', action: 'sleep_cushion', px: 218, py: 166, estimatedCostMs: 9000 },
  { targetId: 'sofa', action: 'nap_on_sofa', px: 96, py: 98, estimatedCostMs: 8000 },
  { targetId: 'study_desk', action: 'study_companion', px: 184, py: 84, estimatedCostMs: 11000 },
  { targetId: 'yarn_ball', action: 'play_yarn', px: 164, py: 140, estimatedCostMs: 5500 },
  { targetId: 'cardboard_box', action: 'hide_in_box', px: 148, py: 130, estimatedCostMs: 8000 },
  { targetId: 'scratching_post', action: 'scratch_stretch', px: 230, py: 144, estimatedCostMs: 4000 },
  { targetId: 'sunny_window', action: 'sunbathe', px: 40, py: 46, estimatedCostMs: 7000 },
  { targetId: 'rug', action: 'lie_idle', px: 176, py: 152, estimatedCostMs: 5000 },
];

export function buildMainGameBlockedGrid(
  mapId: MapId,
  placements: readonly FurniturePlacement[],
): Set<string> {
  return buildMovementCollisionGrid(mapId, placements);
}

export function buildMainGamePetAffordances(hints: MainGamePetWorldHints): AffordanceCandidate[] {
  if (hints.mapId !== 'home') return [];

  const blocked = buildMainGameBlockedGrid(hints.mapId, hints.placements);
  const list: AffordanceCandidate[] = [];

  for (const prop of STATIC_HOME_PROPS) {
    if (prop.targetId === 'study_desk' && !hints.isStudying) continue;

    const anchor = PET_HOME_NAV_ANCHORS.find((a) => a.targetId === prop.targetId);
    const standTileX = anchor ? Math.floor(anchor.anchorPixelX / TILE_SIZE) : Math.floor(prop.px / TILE_SIZE);
    const standTileY = anchor ? Math.floor(anchor.anchorPixelY / TILE_SIZE) : Math.floor(prop.py / TILE_SIZE);
    const standBlocked = blocked.has(`${standTileX},${standTileY}`);

    const available =
      prop.targetId === 'food_bowl'
        ? hints.bowlFoodPortions > 0
        : prop.targetId === 'water_bowl'
          ? hints.waterBowlVolume > 5
          : true;

    list.push({
      id: prop.targetId,
      targetId: prop.targetId,
      action: prop.action,
      available,
      reachable: !standBlocked,
      distance: distancePx(hints.petX, hints.petY, prop.px, prop.py),
      occupied: false,
      cooldownUntilMs: 0,
      estimatedCostMs: prop.estimatedCostMs,
      x: prop.px,
      y: prop.py,
    });
  }

  return list;
}