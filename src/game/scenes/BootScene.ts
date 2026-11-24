import Phaser from 'phaser';
import { AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL } from '../art/atlasProfile';
import { STARTER_FURNITURE_CATALOG } from '../../shared/catalog';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.load.image(AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL);
    this.load.image('tileset-cozy', '/assets/starter/tileset-cozy.png');
    this.load.image('furniture-cozy', '/assets/starter/furniture-cozy.png');
    this.load.tilemapTiledJSON('map-home', '/assets/maps/home.json');
    this.load.tilemapTiledJSON('map-garden', '/assets/maps/garden.json');
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

    this.scene.start('WorldScene');
  }
}
