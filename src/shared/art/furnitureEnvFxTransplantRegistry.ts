/**
 * Worker E slice — furniture / decor / environment FX transplant authority.
 * Unified integration merges this with `semanticAssetRegistry` (Demo E showcase).
 */

export type FurnitureDecorSourcePack =
  | 'modern-interiors-free'
  | 'demo-e-private-unified'
  | 'starter-furniture-cozy'
  | 'rpg-pixel-pack-selective'
  | 'pydew-valley-env';

export interface FurnitureEnvFxTransplantEntry {
  id: string;
  sourcePack: FurnitureDecorSourcePack;
  upstreamRef: string;
  consumerPaths: readonly string[];
  notes: string;
}

/** Primary path: Modern Interiors + Demo E atlas; starter sheet is fallback only. */
export const FURNITURE_ENV_FX_TRANSPLANT: readonly FurnitureEnvFxTransplantEntry[] = [
  {
    id: 'furn.catalog-sprites',
    sourcePack: 'demo-e-private-unified',
    upstreamRef: 'LimeZu Modern Interiors (world-atlas furniture.* frames)',
    consumerPaths: ['src/game/art/worldAtlas.ts', 'src/game/scenes/WorldScene.ts'],
    notes: 'Demo E / private unified when loaded; else starter furniture-cozy rects.',
  },
  {
    id: 'furn.decorate-ghost',
    sourcePack: 'modern-interiors-free',
    upstreamRef: 'cocoworking RoomEditor footprint + cozy-space grid overlay (logic only)',
    consumerPaths: ['src/shared/decorate/decorateGhostAnchor.ts', 'src/game/scenes/WorldScene.ts'],
    notes: 'Semi-transparent SKU sprite + green/red footprint tint.',
  },
  {
    id: 'env.water-fire-windmill',
    sourcePack: 'demo-e-private-unified',
    upstreamRef: 'world-props sheets (sheet.water, sheet.fire, sheet.windmill)',
    consumerPaths: ['src/game/art/worldAtlas.ts', 'src/game/world/outdoorRenderer.ts'],
    notes: 'RPG pixel pack not vendored — use only if a future contact sheet beats atlas quality.',
  },
  {
    id: 'env.rain-drizzle',
    sourcePack: 'pydew-valley-env',
    upstreamRef: 'artemn0va/pydew-valley graphics/rain/drops',
    consumerPaths: ['src/game/world/WorldLightingOverlay.ts', 'src/shared/donor/pydew/pydewRainPresentation.ts'],
    notes: 'Intensity + active flag from world clock weather presentation.',
  },
  {
    id: 'env.farm-water-tiles',
    sourcePack: 'pydew-valley-env',
    upstreamRef: 'pydew-valley graphics/water/* (map tilesets on farm.json)',
    consumerPaths: ['src/game/world/renderDonorPydewMap.ts'],
    notes: 'Static/animated water on farm donor map; rain overlay is global clock-driven.',
  },
];