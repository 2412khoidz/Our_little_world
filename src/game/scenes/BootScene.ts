import Phaser from 'phaser';
import { AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL, USE_PRIVATE_ART } from '../art/atlasProfile';
import { DONOR_PYDEW_TEXTURE_IDS } from '../art/donorPydewFarmerAvatarTexture';
import {
  PYDEW_FARMER_ATLAS_FILES,
  PYDEW_FARMER_SHEET,
  pydewDonorAssetBasePath,
} from '../../shared/donor/pydewFarmerCharacterSheet';
import { preloadWorldAtlas, registerWorldAtlas } from '../art/worldAtlas';
import { STARTER_FURNITURE_CATALOG } from '../../shared/catalog';
import farmWorldJson from '../../../public/assets/maps/farm.json';
import homeWorldJson from '../../../public/assets/maps/home.json';
import gardenWorldJson from '../../../public/assets/maps/garden.json';
import { PYDEW_RAIN_DROP_TEXTURE_KEYS, PYDEW_RAIN_DROP_URLS } from '../../shared/donor/pydew/pydewRainPresentation';
import { sproutTextureKey } from '../world/renderDonorSproutMap';
import {
  LIVING_CAT_32_ANIM_PREFIX,
  LIVING_CAT_32_KEY,
  LIVING_CAT_32_URL,
} from '../pet/livingCatWorldSprite';

const CAT32_ANIM_SPECS: readonly [string, number, number, number][] = [
  ['Happy_South', 0, 6, 12],
  ['Happy_East', 12, 6, 12],
  ['Happy_North', 24, 6, 12],
  ['Happy_West', 36, 6, 12],
  ['Idle_South', 48, 8, 10],
  ['Idle_East', 60, 8, 10],
  ['Idle_North', 72, 8, 10],
  ['Idle_West', 84, 8, 10],
  ['Sleep_South', 96, 12, 6],
  ['Sleep_East', 108, 12, 6],
  ['Sleep_North', 120, 12, 6],
  ['Sleep_West', 132, 12, 6],
  ['Walk_South', 144, 6, 11],
  ['Walk_East', 156, 6, 11],
  ['Walk_North', 168, 6, 11],
  ['Walk_West', 180, 6, 11],
];

const COUPLE_EMOTE_TEX_LIST: readonly [string, string][] = [
  ['olw-emote-heart', '/assets/ui/hybrid/emotes/heart.png'],
  ['olw-emote-hearts', '/assets/ui/hybrid/emotes/hearts_double.png'],
  ['olw-emote-star', '/assets/ui/hybrid/emotes/star.png'],
  ['olw-emote-cat', '/assets/ui/hybrid/emotes/cat_love.png'],
  ['olw-emote-music', '/assets/ui/hybrid/emotes/music.png'],
  ['olw-emote-flower', '/assets/ui/hybrid/emotes/flower.png'],
  ['olw-emote-sleep', '/assets/ui/hybrid/emotes/cat_sleep.png'],
  ['olw-emote-thumbs', '/assets/ui/hybrid/emotes/thumbs_up.png'],
];

function pydewTextureKey(tilesetName: string): string {
  return `donor-pydew-${tilesetName.replace(/\s+/g, '-').toLowerCase()}`;
}

function isSproutDonorMap(json: { properties?: { name: string; value: string }[] }): boolean {
  return json.properties?.some((p) => p.name === 'olwDonor' && p.value === 'sprout-lands') ?? false;
}

function preloadSproutTilesets(
  loader: Phaser.Loader.LoaderPlugin,
  json: { tilesets?: { name: string; image: string }[] },
): void {
  for (const ts of json.tilesets ?? []) {
    if (!ts.image || !ts.name) continue;
    loader.image(sproutTextureKey(ts.name), ts.image);
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image(AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL);
    const farmerRoot = pydewDonorAssetBasePath(USE_PRIVATE_ART);
    const farmerFrame = { frameWidth: PYDEW_FARMER_SHEET.frameWidth, frameHeight: PYDEW_FARMER_SHEET.frameHeight };
    this.load.spritesheet(
      DONOR_PYDEW_TEXTURE_IDS.may,
      `${farmerRoot}/${PYDEW_FARMER_ATLAS_FILES.may}`,
      farmerFrame,
    );
    this.load.spritesheet(
      DONOR_PYDEW_TEXTURE_IDS.nang,
      `${farmerRoot}/${PYDEW_FARMER_ATLAS_FILES.nang}`,
      farmerFrame,
    );
    this.load.spritesheet(
      DONOR_PYDEW_TEXTURE_IDS.rose,
      `${farmerRoot}/${PYDEW_FARMER_ATLAS_FILES.rose}`,
      farmerFrame,
    );
    preloadWorldAtlas(this);
    this.load.image('tileset-cozy', '/assets/starter/tileset-cozy.png');
    this.load.image('furniture-cozy', '/assets/starter/furniture-cozy.png');
    this.load.tilemapTiledJSON('map-home', '/assets/maps/home.json');
    this.load.tilemapTiledJSON('map-garden', '/assets/maps/garden.json');
    this.load.tilemapTiledJSON('map-meadow', '/assets/maps/meadow.json');
    this.load.tilemapTiledJSON('map-village', '/assets/maps/village.json');
    this.load.tilemapTiledJSON('map-farm', '/assets/maps/farm.json');
    this.load.tilemapTiledJSON('map-forest', '/assets/maps/forest.json');
    this.load.tilemapTiledJSON('map-beach', '/assets/maps/beach.json');
    this.load.tilemapTiledJSON('map-shop', '/assets/maps/shop.json');
    this.load.tilemapTiledJSON('map-shop-seed', '/assets/maps/shop_seed.json');
    this.load.tilemapTiledJSON('map-shop-tool', '/assets/maps/shop_tool.json');
    this.load.tilemapTiledJSON('map-shop-crop-market', '/assets/maps/shop_crop_market.json');
    this.load.tilemapTiledJSON('map-shop-town-hall', '/assets/maps/shop_town_hall.json');
    this.load.image('donor-cabacos-ts_map', '/maps/donor/cabacos/ts_map.png');
    this.load.image('donor-cabacos-ts_forest', '/maps/donor/cabacos/ts_forest.png');
    const tuxemonTilesets = [
      'core_outdoor',
      'core_outdoor_water',
      'core_outdoor_nature',
      'prototyping_outdoor',
    ];
    for (const name of tuxemonTilesets) {
      this.load.image(`donor-tuxemon-${name}`, `/maps/donor/tuxemon/gfx/tilesets/${name}.png`);
    }
    this.load.image('donor-cabacos-house-interior', '/maps/donor/cabacos/house_interior_sem_fundo.png');
    this.load.image('donor-cabacos-seed-shop', '/maps/donor/cabacos/seed_shop_sunnyside_style_384x288.png');
    this.load.image('donor-cabacos-tool-shop', '/maps/donor/cabacos/tool_shop_sunnyside_style_384x288.png');
    this.load.image('donor-cabacos-crop-market', '/maps/donor/cabacos/crop_market_sem_fundo.png');
    this.load.image('donor-cabacos-town-hall', '/maps/donor/cabacos/town_hall_sem_fundo.png');
    const hollowmereSprites: [string, string][] = [
      ['donor-hollowmere-ferry', '/maps/donor/hollowmere/sprites/ferry.png'],
      ['donor-hollowmere-palm', '/maps/donor/hollowmere/sprites/palm.png'],
      ['donor-hollowmere-windmill', '/maps/donor/hollowmere/sprites/windmill.png'],
      ['donor-hollowmere-shipping-bin', '/maps/donor/hollowmere/sprites/shipping_bin.png'],
      ['donor-hollowmere-scarecrow', '/maps/donor/hollowmere/sprites/scarecrow.png'],
      ['donor-hollowmere-wishing-well', '/maps/donor/hollowmere/sprites/wishing_well.png'],
      ['donor-hollowmere-crab-pot', '/maps/donor/hollowmere/sprites/crab_pot.png'],
      ['donor-hollowmere-bench', '/maps/donor/hollowmere/sprites/wooden_bench.png'],
      ['donor-hollowmere-string-lights', '/maps/donor/hollowmere/sprites/string_lights.png'],
      ['donor-hollowmere-hay-bale', '/maps/donor/hollowmere/sprites/hay_bale.png'],
      ['donor-hollowmere-greenhouse', '/maps/donor/hollowmere/sprites/greenhouse.png'],
      ['donor-hollowmere-cafe', '/maps/donor/hollowmere/sprites/cafe.png'],
      ['donor-hollowmere-farmhouse', '/maps/donor/hollowmere/sprites/farmhouse.png'],
    ];
    for (const [key, url] of hollowmereSprites) {
      this.load.image(key, url);
    }
    this.load.image('donor-cabacos-soil', '/assets/donor/cabacos-plantation/soil.png');
    this.load.image('donor-cabacos-hoe', '/assets/donor/cabacos-plantation/tools/hoe.png');
    this.load.image('donor-cabacos-watering-can', '/assets/donor/cabacos-plantation/tools/watering_can.png');
    this.load.image('donor-cabacos-rod', '/assets/donor/cabacos-plantation/tools/rod.png');
    this.load.image(
      'donor-cabacos-need-water-indicator',
      '/assets/donor/cabacos-plantation/indicators/crop_need_water.png',
    );
    this.load.image(
      'donor-cabacos-ready-indicator',
      '/assets/donor/cabacos-plantation/indicators/ready_to_collect.png',
    );
    for (let f = 0; f < 4; f += 1) {
      this.load.image(`donor-pydew-tomato-${f}`, `/assets/donor/pydew-farming/fruit/tomato/${f}.png`);
    }
    for (let f = 0; f < 3; f += 1) {
      this.load.image(`donor-pydew-soil-water-${f}`, `/assets/donor/pydew-farming/soil_water/${f}.png`);
    }
    const cropSheets: [string, string, number, number][] = [
      ['donor-cabacos-wheat', '/assets/donor/cabacos-plantation/crops/wheat.png', 13, 16],
      ['donor-cabacos-carrot', '/assets/donor/cabacos-plantation/crops/carrot.png', 12, 13],
      ['donor-cabacos-sunflower', '/assets/donor/cabacos-plantation/crops/sunflower.png', 13, 19],
      ['donor-cabacos-cabbage', '/assets/donor/cabacos-plantation/crops/cabbage.png', 16, 13],
      ['donor-cabacos-beetroot', '/assets/donor/cabacos-plantation/crops/beetroot.png', 16, 16],
    ];
    for (const [key, url, fw, fh] of cropSheets) {
      this.load.spritesheet(key, url, { frameWidth: fw, frameHeight: fh });
    }

    const isPydewFarm = (farmWorldJson as { properties?: { name: string; value: string }[] }).properties?.some(
      (p) => p.name === 'olwDonor' && p.value === 'pydew-valley',
    );
    if (isPydewFarm) {
      for (const ts of (farmWorldJson as { tilesets?: { name: string; image: string }[] }).tilesets ?? []) {
        if (!ts.image || !ts.name) continue;
        this.load.image(pydewTextureKey(ts.name), ts.image);
      }
    }
    if (isSproutDonorMap(homeWorldJson as { properties?: { name: string; value: string }[] })) {
      preloadSproutTilesets(this.load, homeWorldJson as { tilesets?: { name: string; image: string }[] });
    }
    if (isSproutDonorMap(gardenWorldJson as { properties?: { name: string; value: string }[] })) {
      preloadSproutTilesets(this.load, gardenWorldJson as { tilesets?: { name: string; image: string }[] });
    }

    for (const [key, url] of PYDEW_RAIN_DROP_TEXTURE_KEYS.map((k, i) => [k, PYDEW_RAIN_DROP_URLS[i]] as const)) {
      this.load.image(key, url);
    }

    // Crisp 32x32 Frakassets overworld cat + Sprout pixel couple emotes
    this.load.spritesheet(LIVING_CAT_32_KEY, LIVING_CAT_32_URL, { frameWidth: 32, frameHeight: 32 });
    for (const [key, url] of COUPLE_EMOTE_TEX_LIST) {
      this.load.image(key, url);
    }
  }

  create(): void {
    const tilesetTex = this.textures.get('tileset-cozy');
    tilesetTex?.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const furnTex = this.textures.get('furniture-cozy');
    if (furnTex) {
      furnTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const item of STARTER_FURNITURE_CATALOG) {
        if (!furnTex.has(item.sku)) {
          furnTex.add(item.sku, 0, item.sprite.x, item.sprite.y, item.sprite.w, item.sprite.h);
        }
      }
    }

    registerWorldAtlas(this);
    if (
      (farmWorldJson as { properties?: { name: string; value: string }[] }).properties?.some(
        (p) => p.name === 'olwDonor' && p.value === 'pydew-valley',
      )
    ) {
      for (const ts of (farmWorldJson as { tilesets?: { name: string }[] }).tilesets ?? []) {
        this.textures.get(pydewTextureKey(ts.name))?.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    for (const json of [homeWorldJson, gardenWorldJson] as { properties?: { name: string; value: string }[]; tilesets?: { name: string }[] }[]) {
      if (!isSproutDonorMap(json)) continue;
      for (const ts of json.tilesets ?? []) {
        this.textures.get(sproutTextureKey(ts.name))?.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    for (const key of [
      'donor-tuxemon-core_outdoor',
      'donor-tuxemon-core_outdoor_water',
      'donor-tuxemon-core_outdoor_nature',
      'donor-tuxemon-prototyping_outdoor',
      'donor-cabacos-ts_map',
      'donor-cabacos-ts_forest',
      'donor-cabacos-house-interior',
      'donor-cabacos-seed-shop',
      'donor-cabacos-tool-shop',
      'donor-cabacos-crop-market',
      'donor-cabacos-town-hall',
      'donor-hollowmere-ferry',
      'donor-hollowmere-palm',
      'donor-hollowmere-windmill',
      'donor-hollowmere-shipping-bin',
      'donor-hollowmere-scarecrow',
      'donor-hollowmere-wishing-well',
      'donor-hollowmere-crab-pot',
      'donor-hollowmere-bench',
      'donor-hollowmere-string-lights',
      'donor-hollowmere-hay-bale',
      'donor-hollowmere-greenhouse',
      'donor-hollowmere-cafe',
      'donor-hollowmere-farmhouse',
      'donor-cabacos-soil',
      'donor-cabacos-hoe',
      'donor-cabacos-watering-can',
      'donor-cabacos-rod',
      'donor-cabacos-need-water-indicator',
      'donor-cabacos-ready-indicator',
      'donor-pydew-tomato-0',
      'donor-pydew-soil-water-0',
      'donor-cabacos-wheat',
      'donor-cabacos-carrot',
      'donor-cabacos-sunflower',
      'donor-cabacos-cabbage',
      'donor-cabacos-beetroot',
      DONOR_PYDEW_TEXTURE_IDS.may,
      DONOR_PYDEW_TEXTURE_IDS.nang,
      DONOR_PYDEW_TEXTURE_IDS.rose,
      LIVING_CAT_32_KEY,
      ...COUPLE_EMOTE_TEX_LIST.map(([key]) => key),
      ...PYDEW_RAIN_DROP_TEXTURE_KEYS,
    ]) {
      this.textures.get(key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (this.textures.exists(LIVING_CAT_32_KEY)) {
      for (const [tag, start, count, rate] of CAT32_ANIM_SPECS) {
        const animKey = `${LIVING_CAT_32_ANIM_PREFIX}${tag}`;
        if (this.anims.exists(animKey)) continue;
        this.anims.create({
          key: animKey,
          frames: Array.from({ length: count }, (_, i) => ({ key: LIVING_CAT_32_KEY, frame: start + i })),
          frameRate: rate,
          repeat: -1,
        });
      }
    }
    this.scene.start('WorldScene');
  }
}
