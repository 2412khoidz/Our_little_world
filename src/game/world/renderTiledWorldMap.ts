import Phaser from 'phaser';
import extIds from '../art/worldExtendedArtIds.json';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';

/** Depth-ordered render stack (Collision layer omitted — logic only). */
const RENDER_STACK: { name: string; depth: number; animateWater?: boolean }[] = [
  { name: 'Ground', depth: 0 },
  { name: 'Paths', depth: 0.35 },
  { name: 'Water', depth: 1, animateWater: true },
  { name: 'Buildings', depth: 2 },
  { name: 'Vegetation', depth: 3 },
  { name: 'Decor', depth: 3.5 },
  { name: 'Walls', depth: 2.5 },
  { name: 'Foreground', depth: 4500 },
];

const ANIMATED_WATER_GIDS = new Set([51]);

export function renderTiledWorldMapLayers(
  scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  tileset: Phaser.Tilemaps.Tileset,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  for (const spec of RENDER_STACK) {
    if (!tilemap.getLayer(spec.name)) continue;

    if (
      spec.animateWater &&
      scene.textures.exists(WORLD_PROPS_KEY) &&
      scene.anims.exists('olw-water')
    ) {
      const waterLayer = tilemap.getLayer(spec.name)?.tilemapLayer;
      if (waterLayer) {
        waterLayer.visible = false;
        const mapW = tilemap.width;
        const mapH = tilemap.height;
        for (let ty = 0; ty < mapH; ty += 1) {
          for (let tx = 0; tx < mapW; tx += 1) {
            const tile = tilemap.getTileAt(tx, ty, false, spec.name);
            if (!tile || !ANIMATED_WATER_GIDS.has(tile.index)) continue;
            const sprite = scene.add
              .sprite(tx * 16, ty * 16, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`)
              .setOrigin(0, 0)
              .setDepth(spec.depth);
            sprite.play('olw-water');
            pushLayer(sprite);
          }
        }
        continue;
      }
    }

    const created = tilemap.createLayer(spec.name, tileset, 0, 0);
    if (created) {
      created.setDepth(spec.depth);
      pushLayer(created);
    }
  }
}