/**
 * Unified procedural 16x16 pixel-art icon specifications shared between
 * UI React components (`CatalogSkuIcon`) and canonical catalog validation.
 * Pure TypeScript — zero DOM/Canvas imports.
 * Palette/shape taxonomy derived from MIT donor `greens` (src/engine/spritegen.js @ 3f32fd8)
 * and `webfarmville` (client/src/art @ c420bc2).
 */

export type ProceduralIconShape =
  | 'seed_packet'
  | 'leafy'
  | 'head'
  | 'root'
  | 'vine'
  | 'stalk'
  | 'berry'
  | 'round_fruit'
  | 'orchard_sapling'
  | 'flower'
  | 'bouquet'
  | 'animal_egg'
  | 'animal_milk'
  | 'animal_wool'
  | 'animal_honey'
  | 'animal_feather'
  | 'animal_feed'
  | 'fertilizer'
  | 'sprinkler'
  | 'tool_can'
  | 'tool_hoe'
  | 'tool_sickle'
  | 'tool_basket'
  | 'flour_sack'
  | 'bread_loaf'
  | 'pie_slice'
  | 'jam_jar'
  | 'cheese_wheel'
  | 'butter_bar'
  | 'yarn_spool'
  | 'cloth_bolt'
  | 'candle'
  | 'soap_bar'
  | 'bowl_soup'
  | 'platter'
  | 'cup_drink'
  | 'bottle_oil'
  | 'chocolate_bar'
  | 'herb_bundle'
  | 'gift_box'
  | 'fish';

export interface ProceduralIconSpec {
  readonly shape: ProceduralIconShape;
  readonly primary: string;
  readonly secondary?: string;
  readonly accent?: string;
}

const RUNTIME_ICON_REGISTRY = new Map<string, ProceduralIconSpec>();

export function registerProceduralIconSpecs(
  entries: ReadonlyArray<readonly [string, ProceduralIconSpec]>,
): void {
  for (const [sku, spec] of entries) {
    RUNTIME_ICON_REGISTRY.set(sku, spec);
  }
}

export function getProceduralIconSpec(sku: string): ProceduralIconSpec | undefined {
  return RUNTIME_ICON_REGISTRY.get(sku);
}

export function listRegisteredProceduralIconSkus(): string[] {
  return [...RUNTIME_ICON_REGISTRY.keys()];
}
