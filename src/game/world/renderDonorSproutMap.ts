import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';
import { tiledMapPropertyValue } from './renderDonorCabacosMap';

const SKIP_LAYERS = new Set(['Portals', 'Interactables', 'NPCSpawns']);

const HOME_STACK: { name: string; depth: number }[] = [
  { name: 'Ground', depth: 0 },
  { name: 'Decor', depth: 2 },
];

const GARDEN_STACK: { name: string; depth: number }[] = [
  { name: 'Ground', depth: 0 },
  { name: 'Water', depth: 1 },
  { name: 'Paths', depth: 1.5 },
  { name: 'Decor', depth: 3 },
];

export function isDonorSproutMap(tilemap: Phaser.Tilemaps.Tilemap): boolean {
  return tiledMapPropertyValue(tilemap, 'olwDonor') === 'sprout-lands';
}

export function sproutTextureKey(tilesetName: string): string {
  return `donor-sprout-${tilesetName.replace(/[^a-z0-9_]+/gi, '-').toLowerCase()}`;
}

export function getDonorSproutTilesets(
  tilemap: Phaser.Tilemaps.Tilemap,
): Phaser.Tilemaps.Tileset[] {
  const scene = tilemap.scene;
  const out: Phaser.Tilemaps.Tileset[] = [];
  for (const ts of tilemap.tilesets) {
    const textureKey = sproutTextureKey(ts.name);
    if (!scene.textures.exists(textureKey)) continue;
    const tw = ts.tileWidth ?? TILE_SIZE;
    const th = ts.tileHeight ?? TILE_SIZE;
    const added = tilemap.addTilesetImage(ts.name, textureKey, tw, th);
    if (added) out.push(added);
  }
  return out;
}

export function renderDonorSproutMapLayers(
  _scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  tilesets: Phaser.Tilemaps.Tileset[],
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (tilesets.length === 0) return;

  const mapId = tiledMapPropertyValue(tilemap, 'mapId');
  const stack = mapId === 'home' ? HOME_STACK : GARDEN_STACK;

  for (const spec of stack) {
    if (!tilemap.getLayer(spec.name)) continue;
    const created = tilemap.createLayer(spec.name, tilesets, 0, 0);
    if (created) {
      created.setDepth(spec.depth);
      pushLayer(created);
    }
  }

  for (const layerData of tilemap.layers) {
    const name = layerData.name;
    if (SKIP_LAYERS.has(name) || stack.some((s) => s.name === name)) continue;
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