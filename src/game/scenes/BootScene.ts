import Phaser from 'phaser';
import { AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL } from '../art/atlasProfile';
import { preloadWorldAtlas, registerWorldAtlas } from '../art/worldAtlas';
import { STARTER_FURNITURE_CATALOG } from '../../shared/catalog';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image(AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL);
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
    this.load.image('donor-cabacos-ts_map', '/maps/donor/cabacos/ts_map.png');
    this.load.image('donor-cabacos-ts_forest', '/maps/donor/cabacos/ts_forest.png');
    this.load.image('donor-cabacos-house-interior', '/maps/donor/cabacos/house_interior_sem_fundo.png');
    this.load.image('donor-cabacos-soil', '/assets/donor/cabacos-plantation/soil.png');
    this.load.image('donor-cabacos-hoe', '/assets/donor/cabacos-plantation/tools/hoe.png');
    this.load.image(
      'donor-cabacos-watering-can',
      '/assets/donor/cabacos-plantation/tools/watering_can.png',
    );
    this.load.image('donor-cabacos-sickle', '/assets/donor/cabacos-plantation/tools/sickle.png');
    this.load.image(
      'donor-farm-rai-trader',
      '/assets/donor/farm-rai-larn-na/shop/trader.webp',
    );
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
      'donor-cabacos-soil',
      'donor-cabacos-hoe',
      'donor-cabacos-watering-can',
      'donor-cabacos-sickle',
      'donor-farm-rai-trader',
      'donor-cabacos-wheat',
      'donor-cabacos-carrot',
      'donor-cabacos-sunflower',
      'donor-cabacos-cabbage',
      'donor-cabacos-beetroot',
    ]) {
      this.textures.get(key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.scene.start('WorldScene');
  }
}
