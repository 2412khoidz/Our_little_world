/**
 * Procedural perennial fruit tree textures & world sprites (`OrchardVisualController`).
 *
 * Tree canopy pixel art adapted from `fernforge-arcade/greens` (`spritegen.js` genTree
 * @ 3f32fd8, SPDX-License-Identifier: MIT) with 4 stages (`sapling`, `young`, `mature`, `fruiting`)
 * and season tinting + fruit dots per tree species.
 */
import Phaser from 'phaser';
import type { OrchardTreeStage, OrchardTreeView } from '../../shared/farming/orchard';
import type { CalendarSeason } from '../../shared/world/worldCalendar';
import { TILE_SIZE } from '../../shared/maps';
import { FARMING_TREES_ATLAS_KEY, getFarmingTreeFrame } from '../../shared/art/farmingSpriteAtlas';

export const DEFAULT_ORCHARD_SLOT_TILES: ReadonlyArray<readonly [number, number]> = [
  [8, 26],
  [12, 26],
  [16, 26],
  [20, 26],
  [8, 30],
  [12, 30],
  [16, 30],
  [20, 30],
  [8, 34],
  [12, 34],
  [16, 34],
  [20, 34],
];

export function computeOrchardTreeDisplayScale(
  frameH: number,
  stage: OrchardTreeStage,
  tilePixelSize = TILE_SIZE,
): number {
  const safeH = Math.max(1, frameH);
  const targetHeightPx =
    stage === 'sapling'
      ? 1.5 * tilePixelSize
      : stage === 'young'
        ? 2.2 * tilePixelSize
        : 3.0 * tilePixelSize;
  return targetHeightPx / safeH;
}

function textureKey(treeId: string, stage: OrchardTreeStage, season: CalendarSeason): string {
  return `olw-proc-tree-${treeId}-${stage}-${season}`;
}

function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  return `#${c(r).toString(16).padStart(2, '0')}${c(g).toString(16).padStart(2, '0')}${c(b).toString(16).padStart(2, '0')}`;
}

function ensureTreeTexture(
  scene: Phaser.Scene,
  treeId: string,
  stage: OrchardTreeStage,
  season: CalendarSeason,
  canopyHex: string,
  fruitHex: string,
): string | null {
  const key = textureKey(treeId, stage, season);
  if (scene.textures.exists(key)) return key;

  const canvasTex = scene.textures.createCanvas(key, 32, 44);
  if (!canvasTex) return null;
  const ctx = canvasTex.getContext();
  const scale = stage === 'sapling' ? 0.45 : stage === 'young' ? 0.72 : 1;
  const tintCanopy =
    season === 'fall'
      ? '#c87e34'
      : season === 'winter'
        ? '#889b82'
        : canopyHex;

  // Trunk
  ctx.fillStyle = '#6b4a2a';
  const tw = Math.max(2, Math.round(6 * scale));
  const th = Math.max(5, Math.round(14 * scale));
  ctx.fillRect(16 - Math.floor(tw / 2), 44 - th, tw, th);
  ctx.fillStyle = '#553a20';
  ctx.fillRect(16 - Math.floor(tw / 2), 44 - th, 2, th);

  // Layered canopy circles (Greens genTree silhouette)
  const blobs: ReadonlyArray<readonly [number, number, number]> =
    stage === 'sapling'
      ? [[0, 32, 5]]
      : stage === 'young'
        ? [
            [0, 26, 8],
            [-4, 29, 5],
            [4, 29, 5],
          ]
        : [
            [0, 14, 12],
            [-7, 19, 8],
            [7, 19, 8],
            [0, 22, 10],
          ];

  for (const [dx, cy, r] of blobs) {
    ctx.fillStyle = shadeHex(tintCanopy, -0.18);
    ctx.beginPath();
    ctx.arc(16 + dx, cy + 1, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = tintCanopy;
    ctx.beginPath();
    ctx.arc(16 + dx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (stage === 'mature' || stage === 'fruiting') {
    ctx.fillStyle = stage === 'fruiting' ? fruitHex : '#fff4f8';
    const spots: ReadonlyArray<readonly [number, number]> = [
      [12, 13],
      [20, 15],
      [15, 20],
      [10, 21],
      [22, 21],
    ];
    for (const [fx, fy] of spots) {
      ctx.fillRect(fx, fy, stage === 'fruiting' ? 3 : 2, stage === 'fruiting' ? 3 : 2);
    }
  }

  canvasTex.refresh();
  return key;
}

export class OrchardVisualController {
  private readonly sprites = new Map<number, { sprite: Phaser.GameObjects.Image; badge?: Phaser.GameObjects.Text; cacheKey: string }>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pushObject: (obj: Phaser.GameObjects.GameObject) => void,
    private readonly slotTiles: ReadonlyArray<readonly [number, number]> = DEFAULT_ORCHARD_SLOT_TILES,
    private readonly tilePixelSize: number = TILE_SIZE,
  ) {}

  destroy(): void {
    for (const entry of this.sprites.values()) {
      entry.sprite.destroy();
      entry.badge?.destroy();
    }
    this.sprites.clear();
  }

  sync(views: readonly OrchardTreeView[], season: CalendarSeason = 'spring'): void {
    const active = new Set<number>();
    for (const view of views) {
      if (!view.tree || !view.stage) continue;
      const tile = this.slotTiles[view.slotIndex];
      if (!tile) continue;
      active.add(view.slotIndex);

      const cacheKey = `${view.tree.treeId}:${view.stage}:${season}:${view.ready ? 1 : 0}`;
      const existing = this.sprites.get(view.slotIndex);
      if (existing?.cacheKey === cacheKey) continue;

      existing?.sprite.destroy();
      existing?.badge?.destroy();

      const x = tile[0] * this.tilePixelSize + this.tilePixelSize / 2;
      const y = tile[1] * this.tilePixelSize + this.tilePixelSize / 2;
      const tileUnit = this.tilePixelSize / 16;
      const treeFrame = getFarmingTreeFrame(view.tree.treeId, view.stage);
      let sprite: Phaser.GameObjects.Image;
      if (treeFrame && this.scene.textures.exists(FARMING_TREES_ATLAS_KEY)) {
        const treeScale = computeOrchardTreeDisplayScale(treeFrame.h, view.stage, this.tilePixelSize);
        sprite = this.scene.add
          .image(x, y + Math.round(this.tilePixelSize * 0.42), FARMING_TREES_ATLAS_KEY, treeFrame.key)
          .setOrigin(0.5, 0.95)
          .setDepth(Math.round(y + this.tilePixelSize))
          .setScale(treeScale);
      } else {
        const texKey = ensureTreeTexture(
          this.scene,
          view.tree.treeId,
          view.stage,
          season,
          view.tree.canopyColorHex,
          view.tree.fruitColorHex,
        );
        if (!texKey) continue;
        sprite = this.scene.add
          .image(x, y, texKey)
          .setOrigin(0.5, 0.85)
          .setDepth(Math.round(y + this.tilePixelSize))
          .setScale(tileUnit);
      }
      this.pushObject(sprite);

      let badge: Phaser.GameObjects.Text | undefined;
      if (view.ready) {
        const badgeOffsetY = Math.round(this.tilePixelSize * 1.45);
        badge = this.scene.add
          .text(x, y - badgeOffsetY, '🍎', { fontSize: `${Math.round(10 * tileUnit)}px` })
          .setOrigin(0.5)
          .setDepth(Math.round(y + this.tilePixelSize + 1));
        this.pushObject(badge);
      }

      this.sprites.set(view.slotIndex, { sprite, badge, cacheKey });
    }

    for (const slotIdx of [...this.sprites.keys()]) {
      if (!active.has(slotIdx)) {
        const entry = this.sprites.get(slotIdx);
        entry?.sprite.destroy();
        entry?.badge?.destroy();
        this.sprites.delete(slotIdx);
      }
    }
  }
}
