import Phaser from 'phaser';
import type { FarmPlotView } from '../../shared/farming/farmSnapshotTypes';
import { cabacosGrowthStageForPermille } from '../../shared/farming/farmGrowthClock';
import { farmPlotTileForIndex } from '../../shared/farming/farmPlotIndex';
import { FARM_TILE_GIDS } from '../../shared/world/farmPlotContract';
import { resolveFarmCropVisual } from '../../shared/donor/farmCropVisualResolver';
import { TILE_SIZE } from '../../shared/maps';
import {
  ensureFertilizerBadgeTexture,
  ensureProceduralCropTexture,
  ensureSprinklerTexture,
} from './proceduralCropTextures';

const SOIL_LAYER = 'OLW_ContractSoil';
const TILLED_POP_MS = 320;

type PlotVisual = {
  soil?: Phaser.GameObjects.Image;
  wetOverlay?: Phaser.GameObjects.Image;
  fertilizerBadge?: Phaser.GameObjects.Image;
  sprinkler?: Phaser.GameObjects.Image;
  crop?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  indicator?: Phaser.GameObjects.Image;
  stage: string;
};

/**
 * Cabacos `plantation/soil.png`, PyDew soil_water/crop frames, packed farming atlas crops, and
 * Greens fertilizer/sprinkler textures on OLW farm authority.
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
      v.fertilizerBadge?.destroy();
      v.sprinkler?.destroy();
      v.crop?.destroy();
      v.indicator?.destroy();
    }
    this.visuals.clear();
  }

  sync(plots: readonly FarmPlotView[], highlightPlotId?: number): void {
    const active = new Set<number>();
    const tileUnit = this.tilePixelSize / 16;

    for (const plot of plots) {
      if (plot.soil === 'empty' && !plot.sprinkler && !plot.fertilizer) {
        this.clearPlot(plot.plotId);
        this.paintContractSoil(plot.plotId, FARM_TILE_GIDS.soilDry);
        continue;
      }
      active.add(plot.plotId);
      const isWet =
        Boolean(plot.autoWatered) ||
        plot.soil === 'tilled' ||
        (plot.soil === 'planted' && plot.waterCount > 0);
      this.paintContractSoil(plot.plotId, isWet ? FARM_TILE_GIDS.soilWet : FARM_TILE_GIDS.soilDry);

      const stage =
        plot.growthStage ??
        (plot.soil === 'planted' && plot.cropSku
          ? cabacosGrowthStageForPermille(plot.growthPermille, plot.ready, plot.cropSku)
          : null);
      const stageKey = `${plot.soil}:${plot.cropSku ?? ''}:${stage ?? ''}:${plot.ready}:${plot.waterCount}:${plot.autoWatered ? 1 : 0}:${plot.fertilizer ?? ''}:${plot.sprinkler ?? ''}`;
      const existing = this.visuals.get(plot.plotId);
      if (existing?.stage === stageKey) {
        if (highlightPlotId === plot.plotId) this.playTillPop(plot.plotId);
        continue;
      }
      existing?.soil?.destroy();
      existing?.wetOverlay?.destroy();
      existing?.fertilizerBadge?.destroy();
      existing?.sprinkler?.destroy();
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
          .setScale(tileUnit);
        this.pushObject(next.soil);
        if (highlightPlotId === plot.plotId) {
          this.playTillPopOn(next.soil, tileUnit);
        }
      }

      if (isWet) {
        const wetKey = this.pickWetSoilTextureKey(plot);
        if (wetKey) {
          next.wetOverlay = this.scene.add
            .image(cx, cy, wetKey)
            .setDepth(3.25)
            .setScale(this.tilePixelSize / 64);
          this.pushObject(next.wetOverlay);
        }
      }

      if (plot.fertilizer) {
        const fertKey = ensureFertilizerBadgeTexture(this.scene, plot.fertilizer);
        if (fertKey && this.scene.textures.exists(fertKey)) {
          next.fertilizerBadge = this.scene.add
            .image(
              cx - Math.round(this.tilePixelSize * 0.3),
              cy + Math.round(this.tilePixelSize * 0.3),
              fertKey,
            )
            .setDepth(3.28)
            .setScale(0.85 * tileUnit);
          this.pushObject(next.fertilizerBadge);
        }
      }

      if (plot.sprinkler) {
        const spKey = ensureSprinklerTexture(this.scene, plot.sprinkler);
        if (spKey && this.scene.textures.exists(spKey)) {
          next.sprinkler = this.scene.add
            .image(cx, cy - Math.round(1.5 * tileUnit), spKey)
            .setDepth(3.38)
            .setScale(1.0 * tileUnit);
          this.pushObject(next.sprinkler);
        }
      }

      if (plot.soil === 'planted' && plot.cropSku) {
        const growthStage = stage ?? 0;
        const resolved = resolveFarmCropVisual(plot.cropSku, growthStage, plot.ready, this.tilePixelSize);
        if (resolved?.mode === 'farming_atlas' && this.scene.textures.exists(resolved.textureKey) && resolved.frameKey) {
          const anchorY = cy + Math.round(this.tilePixelSize * 0.35);
          next.crop = this.scene.add
            .image(cx, anchorY, resolved.textureKey, resolved.frameKey)
            .setOrigin(0.5, 0.92)
            .setDepth(3.4)
            .setScale(resolved.displayScale);
        } else {
          if (resolved?.mode === 'procedural_crop') {
            ensureProceduralCropTexture(this.scene, plot.cropSku, growthStage, plot.ready);
          }
          if (resolved && this.scene.textures.exists(resolved.textureKey)) {
            if (resolved.mode === 'cabacos_spritesheet') {
              next.crop = this.scene.add
                .sprite(cx, cy - Math.round(2 * tileUnit), resolved.textureKey, resolved.frame)
                .setDepth(3.4)
                .setScale(resolved.displayScale);
            } else {
              next.crop = this.scene.add
                .image(cx, cy, resolved.textureKey)
                .setDepth(3.4)
                .setScale(resolved.displayScale);
            }
          }
        }
        if (next.crop) {
          if (plot.seasonMatch === false && !plot.greenhouse && !plot.ready) {
            next.crop.setAlpha(0.88);
          }
          this.pushObject(next.crop);
        }
        const indicatorKey = this.plotIndicatorTexture(plot);
        if (indicatorKey) {
          const indOffsetY = Math.max(12, Math.round(this.tilePixelSize * 0.85));
          next.indicator = this.scene.add
            .image(cx, cy - indOffsetY, indicatorKey)
            .setDepth(3.55)
            .setScale(0.85 * tileUnit);
          next.indicator.setTint(plot.ready ? 0xffe066 : 0x4fc3f7);
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
      !plot.autoWatered &&
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
    v?.fertilizerBadge?.destroy();
    v?.sprinkler?.destroy();
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
    if (v?.soil) this.playTillPopOn(v.soil, this.tilePixelSize / 16);
  }

  private playTillPopOn(image: Phaser.GameObjects.Image, targetScale = 1): void {
    this.scene.tweens.add({
      targets: image,
      scaleX: { from: targetScale * 0.6, to: targetScale },
      scaleY: { from: targetScale * 0.6, to: targetScale },
      duration: TILLED_POP_MS,
      ease: 'Back.Out',
    });
  }
}
