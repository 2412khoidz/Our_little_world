import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import { tiledMapPropertyValue } from './renderDonorCabacosMap';

const SKIP_LAYERS = new Set(['Portals', 'Interactables', 'NPCSpawns', 'Events', 'Collisions']);

const RENDER_STACK: { name: string; depth: number }[] = [
  { name: 'Ground', depth: 0 },
  { name: 'Water', depth: 1 },
  { name: 'Vegetation', depth: 3 },
  { name: 'Above Player', depth: 4500 },
];

export function isDonorTuxemonMap(tilemap: Phaser.Tilemaps.Tilemap): boolean {
  return tiledMapPropertyValue(tilemap, 'olwDonor') === 'tuxemon';
}

export function getDonorTuxemonTilesets(
  tilemap: Phaser.Tilemaps.Tilemap,
): Phaser.Tilemaps.Tileset[] {
  const scene = tilemap.scene;
  const out: Phaser.Tilemaps.Tileset[] = [];
  for (const ts of tilemap.tilesets) {
    const fileName = ts.name.replace(/[^a-z0-9_]+/gi, '_');
    const textureKey = `donor-tuxemon-${fileName}`;
    if (!scene.textures.exists(textureKey)) continue;
    const tw = ts.tileWidth ?? TILE_SIZE;
    const th = ts.tileHeight ?? TILE_SIZE;
    const added = tilemap.addTilesetImage(ts.name, textureKey, tw, th);
    if (added) out.push(added);
  }
  return out;
}

export function renderDonorTuxemonMapLayers(
  _scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  tilesets: Phaser.Tilemaps.Tileset[],
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (tilesets.length === 0) return;

  for (const spec of RENDER_STACK) {
    if (!tilemap.getLayer(spec.name)) continue;
    const created = tilemap.createLayer(spec.name, tilesets, 0, 0);
    if (created) {
      created.setDepth(spec.depth);
      pushLayer(created);
    }
  }

  for (const layerData of tilemap.layers) {
    const name = layerData.name;
    if (SKIP_LAYERS.has(name) || RENDER_STACK.some((s) => s.name === name)) continue;
    if (name === 'Collision') continue;
    if (!tilemap.getLayer(name)) continue;
    const created = tilemap.createLayer(name, tilesets, 0, 0);
    if (created) {
      created.setDepth(2);
      pushLayer(created);
    }
  }

  const collision = tilemap.createLayer('Collision', tilesets, 0, 0);
  if (collision) {
    collision.setVisible(false);
    pushLayer(collision);
  }
}