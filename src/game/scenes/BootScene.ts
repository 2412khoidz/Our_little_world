import Phaser from 'phaser';
import { AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL, USE_PRIVATE_ART } from '../art/atlasProfile';
import { DONOR_PUNY_TEXTURE_IDS } from '../art/donorPunyAvatarTexture';
import { PUNY_SHEET, punyDonorAssetBasePath } from '../../shared/donor/punyCharacter8dSheet';
import { preloadWorldAtlas, registerWorldAtlas } from '../art/worldAtlas';
import { STARTER_FURNITURE_CATALOG } from '../../shared/catalog';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image(AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL);
    const punyRoot = punyDonorAssetBasePath(USE_PRIVATE_ART);
    const punyFrame = { frameWidth: PUNY_SHEET.frameWidth, frameHeight: PUNY_SHEET.frameHeight };
    this.load.spritesheet(DONOR_PUNY_TEXTURE_IDS.base, `${punyRoot}/character-base.png`, punyFrame);
    this.load.spritesheet(DONOR_PUNY_TEXTURE_IDS.soldierBlue, `${punyRoot}/soldier-blue.png`, punyFrame);
    this.load.spritesheet(DONOR_PUNY_TEXTURE_IDS.soldierRed, `${punyRoot}/soldier-red.png`, punyFrame);
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
    this.load.image('donor-cabacos-house-interior', '/maps/donor/cabacos/house_interior_sem_fundo.png');
    this.load.image('donor-cabacos-seed-shop', '/maps/donor/cabacos/seed_shop_sunnyside_style_384x288.png');
    this.load.image('donor-cabacos-tool-shop', '/maps/donor/cabacos/tool_shop_sunnyside_style_384x288.png');
    this.load.image('donor-cabacos-crop-market', '/maps/donor/cabacos/crop_market_sem_fundo.png');
    this.load.image('donor-cabacos-town-hall', '/maps/donor/cabacos/town_hall_sem_fundo.png');
    this.load.image('donor-cabacos-soil', '/assets/donor/cabacos-plantation/soil.png');
    this.load.image('donor-cabacos-hoe', '/assets/donor/cabacos-plantation/tools/hoe.png');
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
    for (const key of [
      'donor-cabacos-ts_map',
      'donor-cabacos-ts_forest',
      'donor-cabacos-house-interior',
      'donor-cabacos-seed-shop',
      'donor-cabacos-tool-shop',
      'donor-cabacos-crop-market',
      'donor-cabacos-town-hall',
      'donor-cabacos-soil',
      'donor-cabacos-hoe',
      'donor-cabacos-wheat',
      'donor-cabacos-carrot',
      'donor-cabacos-sunflower',
      'donor-cabacos-cabbage',
      'donor-cabacos-beetroot',
      DONOR_PUNY_TEXTURE_IDS.base,
      DONOR_PUNY_TEXTURE_IDS.soldierBlue,
      DONOR_PUNY_TEXTURE_IDS.soldierRed,
    ]) {
      this.textures.get(key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.scene.start('WorldScene');
  }
}
