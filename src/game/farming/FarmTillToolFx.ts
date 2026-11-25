import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import { farmPlotTileForIndex } from '../../shared/farming/farmPlotIndex';

/** Cabacos hoe.png one-shot swing at plot center after successful till (presentation only). */
export function playFarmTillToolFx(
  scene: Phaser.Scene,
  plotIndex: number,
  pushObject: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (!scene.textures.exists('donor-cabacos-hoe')) return;
  const tile = farmPlotTileForIndex(plotIndex);
  if (!tile) return;
  const cx = tile.tileX * TILE_SIZE + TILE_SIZE / 2;
  const cy = tile.tileY * TILE_SIZE + TILE_SIZE / 2;
  const hoe = scene.add.image(cx, cy - 6, 'donor-cabacos-hoe').setDepth(4).setScale(1).setAngle(-35);
  pushObject(hoe);
  scene.tweens.add({
    targets: hoe,
    angle: 25,
    y: cy - 2,
    duration: 220,
    ease: 'Quad.Out',
    onComplete: () => {
      scene.tweens.add({
        targets: hoe,
        alpha: 0,
        duration: 120,
        onComplete: () => hoe.destroy(),
      });
    },
  });
}