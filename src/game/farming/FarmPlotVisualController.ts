import Phaser from 'phaser';
import type { FarmPlotView } from '../../shared/farming/farmSnapshotTypes';
import { cabacosGrowthStageForPermille } from '../../shared/farming/farmGrowthClock';
import { farmPlotTileForIndex } from '../../shared/farming/farmPlotIndex';
import { FARM_TILE_GIDS } from '../../shared/world/farmPlotContract';
import { resolveFarmCropVisual } from '../../shared/donor/farmCropVisualResolver';
import { TILE_SIZE } from '../../shared/maps';

const SOIL_LAYER = 'OLW_ContractSoil';
const TILLED_POP_MS = 320;

type PlotVisual = {
  soil?: Phaser.GameObjects.Image;
  wetOverlay?: Phaser.GameObjects.Image;
  crop?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  indicator?: Phaser.GameObjects.Image;
  stage: string;
};

/**
 * Cabacos `plantation/soil.png` + PyDew soil_water/crop frames on OLW farm authority.
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
      v.wetOverlay?.destroy();
      v.crop?.destroy();
      v.indicator?.destroy();
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
      const isWet =
        plot.soil === 'tilled' || (plot.soil === 'planted' && plot.waterCount > 0);
      this.paintContractSoil(plot.plotId, isWet ? FARM_TILE_GIDS.soilWet : FARM_TILE_GIDS.soilDry);

      const stage = plot.growthStage ?? (plot.soil === 'planted' && plot.cropSku
        ? cabacosGrowthStageForPermille(plot.growthPermille, plot.ready, plot.cropSku)
        : null);
      const stageKey = `${plot.soil}:${plot.cropSku ?? ''}:${stage ?? ''}:${plot.ready}:${plot.waterCount}`;
      const existing = this.visuals.get(plot.plotId);
      if (existing?.stage === stageKey) {
        if (highlightPlotId === plot.plotId) this.playTillPop(plot.plotId);
        continue;
      }
      existing?.soil?.destroy();
      existing?.wetOverlay?.destroy();
      existing?.crop?.destroy();
      existing?.indicator?.destroy();

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

      if (isWet) {
        const wetKey = this.pickWetSoilTextureKey(plot);
        if (wetKey) {
          const wetScale = this.tilePixelSize / 64;
          next.wetOverlay = this.scene.add.image(cx, cy, wetKey).setDepth(3.25).setScale(wetScale);
          this.pushObject(next.wetOverlay);
        }
      }

      if (plot.soil === 'planted' && plot.cropSku) {
        const growthStage = stage ?? 0;
        const resolved = resolveFarmCropVisual(plot.cropSku, growthStage, plot.ready);
        if (resolved && this.scene.textures.exists(resolved.textureKey)) {
          if (resolved.mode === 'cabacos_spritesheet') {
            next.crop = this.scene.add
              .sprite(cx, cy - 2, resolved.textureKey, resolved.frame)
              .setDepth(3.4)
              .setScale(resolved.displayScale);
          } else {
            next.crop = this.scene.add
              .image(cx, cy, resolved.textureKey)
              .setDepth(3.4)
              .setScale(resolved.displayScale);
          }
          this.pushObject(next.crop);
        }
        const indicatorKey = this.plotIndicatorTexture(plot);
        if (indicatorKey) {
          next.indicator = this.scene.add
            .image(cx, cy - Math.max(12, Math.round(this.tilePixelSize * 0.85)), indicatorKey)
            .setDepth(3.55)
            .setScale(1);
          if (plot.ready) {
            next.indicator.setTint(0xffe066);
          } else {
            next.indicator.setTint(0x4fc3f7);
          }
          this.pushObject(next.indicator);
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

  private pickWetSoilTextureKey(plot: FarmPlotView): string | null {
    if (this.scene.textures.exists('donor-pydew-soil-water-1')) {
      const idx = Math.min(2, Math.max(0, plot.waterCount));
      const key = `donor-pydew-soil-water-${idx}`;
      return this.scene.textures.exists(key) ? key : 'donor-pydew-soil-water-1';
    }
    return null;
  }

  private plotIndicatorTexture(plot: FarmPlotView): string | null {
    if (plot.ready && this.scene.textures.exists('donor-cabacos-ready-indicator')) {
      return 'donor-cabacos-ready-indicator';
    }
    if (
      !plot.ready &&
      plot.waterCount < 1 &&
      this.scene.textures.exists('donor-cabacos-need-water-indicator')
    ) {
      return 'donor-cabacos-need-water-indicator';
    }
    return null;
  }

  private clearPlot(plotId: number): void {
    const v = this.visuals.get(plotId);
    v?.soil?.destroy();
    v?.wetOverlay?.destroy();
    v?.crop?.destroy();
    v?.indicator?.destroy();
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