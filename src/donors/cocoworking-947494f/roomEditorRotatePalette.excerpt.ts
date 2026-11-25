/**
 * MIT — cocolocow/cocoworking @ 947494f933e40812051ed7f3905602b04b9c5fe4
 * Source: packages/client/src/scenes/RoomEditor.ts (PALETTE + ROTATIONS)
 * Reference only — OLW decorate loop: src/shared/decorate/decoratePlacementLoop.ts
 */

export const COCOWORKING_ROOM_EDITOR_PALETTE = [
  'desk',
  'desk-b',
  'chair-a',
  'chair-b',
  'chair-c',
  'chair-d',
  'gchair-a',
  'gchair-b',
  'gchair-c',
  'gchair-d',
  'sofa-a',
  'sofa-b',
  'pillow',
  'imac-a',
  'imac-b',
  'keyboard',
  'pc-tower',
  'wacom',
  'bended-screen',
  'plant-1',
  'plant-2',
  'cactus-1',
  'cactus-2',
  'sunflower',
  'carpet',
] as const;

export const COCOWORKING_TEXTURE_ROTATIONS: Record<string, readonly string[]> = {
  'chair-a': ['chair-a', 'chair-b', 'chair-c', 'chair-d'],
  'gchair-a': ['gchair-a', 'gchair-b', 'gchair-c', 'gchair-d'],
  'sofa-a': ['sofa-a', 'sofa-b'],
  desk: ['desk', 'desk-b'],
  'imac-a': ['imac-a', 'imac-b'],
};