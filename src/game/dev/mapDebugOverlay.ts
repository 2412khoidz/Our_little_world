import Phaser from 'phaser';
import { getMapDefinition, TILE_SIZE } from '../../shared/maps';
import { MAIN_GAME_WORLD_ANCHORS } from '../../shared/interaction/mainGameWorldAnchors';
import type { MapId } from '../../shared/types';
import { isMapCollisionDebugEnabled } from './mapDebugFlag';

export class MapDebugOverlay {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private enabled = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.enabled = isMapCollisionDebugEnabled();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.graphics?.clear();
      this.graphics?.setVisible(false);
    }
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  redraw(mapId: MapId, blockedGrid: Set<string>): void {
    if (!this.enabled) return;
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics().setDepth(12000).setScrollFactor(1);
    }
    const g = this.graphics;
    g.clear();
    g.setVisible(true);

    const def = getMapDefinition(mapId);
    const w = def.widthTiles * TILE_SIZE;
    const h = def.heightTiles * TILE_SIZE;

    g.lineStyle(2, 0x33ff66, 0.9);
    g.strokeRect(0.5, 0.5, w - 1, h - 1);

    for (let ty = 0; ty < def.heightTiles; ty += 1) {
      for (let tx = 0; tx < def.widthTiles; tx += 1) {
        if (!blockedGrid.has(`${tx},${ty}`)) continue;
        g.fillStyle(0xff2244, 0.35);
        g.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    for (const portal of def.portals) {
      const px = portal.tileX * TILE_SIZE;
      const py = portal.tileY * TILE_SIZE;
      g.lineStyle(2, 0x44ddff, 1);
      g.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }

    const anchors =
      mapId === 'home'
        ? Object.values(MAIN_GAME_WORLD_ANCHORS.home)
        : mapId === 'garden'
          ? Object.values(MAIN_GAME_WORLD_ANCHORS.garden)
          : [];

    for (const a of anchors) {
      g.fillStyle(0xffee33, 0.85);
      g.fillCircle(a.x, a.y, 5);
    }
  }

  destroy(): void {
    this.graphics?.destroy();
    this.graphics = null;
  }
}