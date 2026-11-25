/**
 * Catalog SKU → props-manifest semantic id (`prop.*` / `env.*`).
 * Rects resolve at runtime from `ART_ATLAS_PATH/props-manifest.json` (unified or private Demo E).
 */
export const CATALOG_SKU_TO_PROPS_ICON_ID = {
  tool_hoe: 'prop.planter_box',
  tool_watering_can: 'prop.pet_bowl_water',

  seed_wheat: 'prop.corn',
  seed_carrot: 'prop.radish',
  seed_tomato: 'prop.tomato',
  seed_strawberry: 'prop.beetroot',
  seed_sunflower: 'prop.sunflower',
  seed_rose_pink: 'prop.sakura_petals',
  seed_cabbage: 'prop.cabbage',

  wheat: 'prop.corn',
  carrot: 'prop.radish',
  tomato: 'prop.tomato',
  strawberry: 'prop.beetroot',
  sunflower: 'prop.sunflower',
  rose_pink: 'prop.sakura_petals',
  rose_sakura: 'prop.sakura_bush',
  cabbage: 'prop.cabbage',
  peach: 'prop.peach_tree',

  sugar_pack: 'prop.picnic_teacup',
  spice: 'prop.beehive',
  strawberry_jam: 'prop.picnic_tart',
  flour: 'prop.corn',
  ribbon: 'prop.sakura_petals',

  wild_herb: 'env.meadow_flora',
  wood_branch: 'prop.fence_1w',

  bait_free_worm: 'env.meadow_flora',
  bait_shrimp: 'prop.water_reed_a',
  carp_pond: 'prop.water_lily',
  koi_pastel: 'prop.water_lotus',
  lotus_trout: 'prop.water_reed_b',

  carrot_soup: 'prop.picnic_teacup',
  herb_carp: 'prop.picnic_basket',
  peach_tea: 'prop.picnic_teacup',
  strawberry_tart: 'prop.picnic_tart',
  koinori_platter: 'prop.picnic_basket',
  sakura_bouquet: 'prop.sakura_bush',
  wood_chair: 'prop.study_chair',
} as const satisfies Record<string, string>;

export type CatalogSkuPropsIconSku = keyof typeof CATALOG_SKU_TO_PROPS_ICON_ID;
export type PropsManifestIconId =
  (typeof CATALOG_SKU_TO_PROPS_ICON_ID)[CatalogSkuPropsIconSku];

const MAP: Readonly<Record<string, PropsManifestIconId>> = CATALOG_SKU_TO_PROPS_ICON_ID;

export function propsIconIdForCatalogSku(sku: string): PropsManifestIconId | null {
  return MAP[sku] ?? null;
}

export function listCatalogSkuPropsIconMappings(): readonly {
  readonly sku: string;
  readonly propsIconId: PropsManifestIconId;
}[] {
  return Object.entries(MAP).map(([sku, propsIconId]) => ({ sku, propsIconId }));
}