import Phaser from 'phaser';
import type { FarmPlotView } from '../../shared/farming/farmSnapshotTypes';
import { cabacosCropVisual } from '../../shared/donor/cabacos-79e423d/cropVisualRegistry';
import { cabacosGrowthStageForPermille } from '../../shared/farming/farmGrowthClock';
import { farmPlotTileForIndex } from '../../shared/farming/farmPlotIndex';
import { FARM_TILE_GIDS } from '../../shared/world/farmPlotContract';
import { TILE_SIZE } from '../../shared/maps';

const SOIL_LAYER = 'OLW_ContractSoil';
const TILLED_POP_MS = 320;

type PlotVisual = { soil?: Phaser.GameObjects.Image; crop?: Phaser.GameObjects.Sprite; stage: string };

/**
 * Cabacos `plantation/soil.png` + crop spritesheet slice on OLW farm authority.
 * Presentation only — soil state read from `FarmPlotView`, never a second authority.
 */
export class FarmPlotVisualController {
  private readonly visuals = new Map<number, PlotVisual>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly tilemap: Phaser.Tilemaps.Tilemap | null,
    private readonly cozyTilesetName: string,
    private readonly pushObject: (obj: Phaser.GameObjects.GameObject) => void,
    private readonly tilePixelSize: number = TILE_SIZE,
  ) {}

  destroy(): void {
    for (const v of this.visuals.values()) {
      v.soil?.destroy();
      v.crop?.destroy();
    }
    this.visuals.clear();
  }

  sync(plots: readonly FarmPlotView[], highlightPlotId?: number): void {
    const active = new Set<number>();
    for (const plot of plots) {
      if (plot.soil === 'empty') {
        this.clearPlot(plot.plotId);
        this.paintContractSoil(plot.plotId, FARM_TILE_GIDS.soilDry);
        continue;
      }
      active.add(plot.plotId);
      this.paintContractSoil(
        plot.plotId,
        plot.soil === 'tilled' || (plot.soil === 'planted' && plot.waterCount > 0)
          ? FARM_TILE_GIDS.soilWet
          : FARM_TILE_GIDS.soilDry,
      );
      const stageKey = `${plot.soil}:${plot.cropSku ?? ''}:${plot.growthStage ?? ''}:${plot.ready}`;
      const existing = this.visuals.get(plot.plotId);
      if (existing?.stage === stageKey) {
        if (highlightPlotId === plot.plotId) this.playTillPop(plot.plotId);
        continue;
      }
      existing?.soil?.destroy();
      existing?.crop?.destroy();

      const tile = farmPlotTileForIndex(plot.plotId);
      if (!tile) continue;
      const cx = tile.tileX * this.tilePixelSize + this.tilePixelSize / 2;
      const cy = tile.tileY * this.tilePixelSize + this.tilePixelSize / 2;
      const next: PlotVisual = { stage: stageKey };

      if (plot.soil === 'tilled' && this.scene.textures.exists('donor-cabacos-soil')) {
        next.soil = this.scene.add
          .image(cx, cy, 'donor-cabacos-soil')
          .setDepth(3.2)
          .setScale(1);
        this.pushObject(next.soil);
        if (highlightPlotId === plot.plotId) {
          this.playTillPopOn(next.soil);
        }
      }

      if (plot.soil === 'planted' && plot.cropSku) {
        const vis = cabacosCropVisual(plot.cropSku);
        const permille = plot.growthPermille;
        const stage = plot.growthStage ?? cabacosGrowthStageForPermille(permille, plot.ready, plot.cropSku);
        const frame = Math.min(vis?.ripeFrame ?? 3, Math.max(0, stage));
        if (vis && this.scene.textures.exists(vis.textureKey)) {
          next.crop = this.scene.add.sprite(cx, cy - 2, vis.textureKey, frame).setDepth(3.4);
          this.pushObject(next.crop);
        }
      }

      this.visuals.set(plot.plotId, next);
    }
    for (const id of this.visuals.keys()) {
      if (!active.has(id)) {
        this.clearPlot(id);
      }
    }
  }

  private clearPlot(plotId: number): void {
    const v = this.visuals.get(plotId);
    v?.soil?.destroy();
    v?.crop?.destroy();
    this.visuals.delete(plotId);
  }

  private paintContractSoil(plotId: number, gid: number): void {
    if (!this.tilemap) return;
    const layer = this.tilemap.getLayer(SOIL_LAYER)?.tilemapLayer;
    const tile = farmPlotTileForIndex(plotId);
    if (!layer || !tile) return;
    const cozy = this.tilemap.getTileset(this.cozyTilesetName);
    if (!cozy) return;
    const localIndex = gid - cozy.firstgid;
    if (localIndex < 0) return;
    layer.putTileAt(localIndex, tile.tileX, tile.tileY);
  }

  private playTillPop(plotId: number): void {
    const v = this.visuals.get(plotId);
    if (v?.soil) this.playTillPopOn(v.soil);
  }

  private playTillPopOn(image: Phaser.GameObjects.Image): void {
    this.scene.tweens.add({
      targets: image,
      scaleX: { from: 0.6, to: 1 },
      scaleY: { from: 0.6, to: 1 },
      duration: TILLED_POP_MS,
      ease: 'Back.Out',
    });
  }
}