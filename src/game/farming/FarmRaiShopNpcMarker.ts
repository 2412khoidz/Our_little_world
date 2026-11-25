import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import { FARM_SLICE_SEED_SHOP_TILE } from '../../shared/farming/farmPlayableBridge';

const PORTRAIT_KEY = 'donor-farm-rai-trader';

/** World portrait beside seed-shop interactable (presentation only). */
export function ensureFarmRaiShopNpcMarker(
  scene: Phaser.Scene,
  pushObject: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (!scene.textures.exists(PORTRAIT_KEY)) return;
  const cx = FARM_SLICE_SEED_SHOP_TILE.tileX * TILE_SIZE + TILE_SIZE / 2;
  const cy = FARM_SLICE_SEED_SHOP_TILE.tileY * TILE_SIZE - TILE_SIZE * 1.1;
  const img = scene.add
    .image(cx, cy, PORTRAIT_KEY)
    .setDepth(3)
    .setScale(0.85)
    .setOrigin(0.5, 1);
  pushObject(img);
}

export const FARM_RAI_TRADER_TEXTURE_KEY = PORTRAIT_KEY;
export const FARM_RAI_TRADER_TEXTURE_URL = '/assets/donor/farm-rai-larn-na/shop/trader.webp';