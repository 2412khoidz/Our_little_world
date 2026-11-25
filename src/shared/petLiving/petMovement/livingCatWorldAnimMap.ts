import type { PetAnimState, PetFacing } from '../petVisualTypes';

function facingSuffix(facing: PetFacing): 'North' | 'South' | 'East' | 'West' {
  switch (facing) {
    case 'north':
      return 'North';
    case 'east':
      return 'East';
    case 'west':
      return 'West';
    default:
      return 'South';
  }
}

function facingFromAnimState(state: PetAnimState): PetFacing {
  if (state.endsWith('_north')) return 'north';
  if (state.endsWith('_east')) return 'east';
  if (state.endsWith('_west')) return 'west';
  return 'south';
}

/** Maps overworld locomotion states to `worldAtlas` Frakassets cat-orange tags. */
export function mapWorldPetStateToOlwCatAnim(state: PetAnimState): string {
  const facing = facingSuffix(facingFromAnimState(state));

  if (state.startsWith('walk_') || state.startsWith('run_')) {
    return `olw-cat-Walk_${facing}`;
  }
  if (state === 'sleep' || state === 'lie_down') {
    return `olw-cat-Sleep_${facing}`;
  }
  if (
    state === 'happy_hop' ||
    state === 'pet_purr' ||
    state === 'eat' ||
    state === 'play_pounce' ||
    state === 'box_peek' ||
    state === 'drink'
  ) {
    return `olw-cat-Happy_${facing}`;
  }
  return `olw-cat-Idle_${facing}`;
}