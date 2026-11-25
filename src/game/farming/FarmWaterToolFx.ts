import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import { farmPlotTileForIndex } from '../../shared/farming/farmPlotIndex';

/** Cabacos watering_can one-shot splash at plot center (presentation only). */
export function playFarmWaterToolFx(
  scene: Phaser.Scene,
  plotIndex: number,
  pushObject: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (!scene.textures.exists('donor-cabacos-watering-can')) return;
  const tile = farmPlotTileForIndex(plotIndex);
  if (!tile) return;
  const cx = tile.tileX * TILE_SIZE + TILE_SIZE / 2;
  const cy = tile.tileY * TILE_SIZE + TILE_SIZE / 2;
  const can = scene.add.image(cx + 4, cy - 10, 'donor-cabacos-watering-can').setDepth(4).setScale(1.1).setAngle(18);
  pushObject(can);
  scene.tweens.add({
    targets: can,
    angle: -12,
    y: cy - 4,
    duration: 260,
    ease: 'Sine.Out',
    onComplete: () => {
      scene.tweens.add({
        targets: can,
        alpha: 0,
        duration: 160,
        onComplete: () => can.destroy(),
      });
    },
  });
}