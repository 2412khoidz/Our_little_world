import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import { farmPlotTileForIndex } from '../../shared/farming/farmPlotIndex';

/** Cabacos tool PNG tweens — upstream has no swing spritesheets (only static tools/*.png). */
export type FarmToolSwingKind = 'till' | 'water' | 'harvest';

const TOOL_TEXTURE: Record<FarmToolSwingKind, string> = {
  till: 'donor-cabacos-hoe',
  water: 'donor-cabacos-watering-can',
  harvest: 'donor-cabacos-sickle',
};

export function playFarmToolSwingFx(
  scene: Phaser.Scene,
  plotIndex: number,
  kind: FarmToolSwingKind,
  pushObject: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  const key = TOOL_TEXTURE[kind];
  if (!scene.textures.exists(key)) return;
  const tile = farmPlotTileForIndex(plotIndex);
  if (!tile) return;
  const cx = tile.tileX * TILE_SIZE + TILE_SIZE / 2;
  const cy = tile.tileY * TILE_SIZE + TILE_SIZE / 2;

  const tool = scene.add.image(cx, cy - 6, key).setDepth(4).setScale(1);
  pushObject(tool);

  if (kind === 'till') {
    tool.setAngle(-35);
    scene.tweens.add({
      targets: tool,
      angle: 25,
      y: cy - 2,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => fadeDestroy(scene, tool),
    });
    return;
  }

  if (kind === 'water') {
    tool.setAngle(-20);
    scene.tweens.add({
      targets: tool,
      angle: 10,
      y: cy - 4,
      scaleX: 1.05,
      duration: 180,
      yoyo: true,
      ease: 'Sine.InOut',
      onComplete: () => fadeDestroy(scene, tool),
    });
    return;
  }

  tool.setAngle(15);
  scene.tweens.add({
    targets: tool,
    angle: -40,
    x: cx + 4,
    duration: 160,
    ease: 'Quad.In',
    onComplete: () => fadeDestroy(scene, tool),
  });
}

/** @deprecated use playFarmToolSwingFx(..., 'till', ...) */
export function playFarmTillToolFx(
  scene: Phaser.Scene,
  plotIndex: number,
  pushObject: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  playFarmToolSwingFx(scene, plotIndex, 'till', pushObject);
}

function fadeDestroy(scene: Phaser.Scene, tool: Phaser.GameObjects.Image): void {
  scene.tweens.add({
    targets: tool,
    alpha: 0,
    duration: 120,
    onComplete: () => tool.destroy(),
  });
}