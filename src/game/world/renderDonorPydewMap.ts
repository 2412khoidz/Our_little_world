import Phaser from 'phaser';
import { tiledMapPropertyValue } from './renderDonorCabacosMap';

const SKIP_LAYERS = new Set([
  'Collision',
  'Farmable',
  'Water',
  'Portals',
  'Interactables',
  'NPCSpawns',
  'Player',
  'Trees',
  'Decoration',
  'Objects',
]);

export function isDonorPydewValleyMap(tilemap: Phaser.Tilemaps.Tilemap): boolean {
  return tiledMapPropertyValue(tilemap, 'olwDonor') === 'pydew-valley';
}

export function isDonorPydewValleyMapFromCache(
  scene: Phaser.Scene,
  mapKey: string,
): boolean {
  const raw = scene.cache.tilemap.get(mapKey)?.data as { properties?: { name: string; value: string }[] } | undefined;
  return raw?.properties?.some((p) => p.name === 'olwDonor' && p.value === 'pydew-valley') ?? false;
}

export function getDonorPydewTilesets(tilemap: Phaser.Tilemaps.Tilemap): Phaser.Tilemaps.Tileset[] {
  const out: Phaser.Tilemaps.Tileset[] = [];
  for (const ts of tilemap.tilesets) {
    const slug = ts.name.replace(/\s+/g, '-').toLowerCase();
    const textureKey = `donor-pydew-${slug}`;
    if (!tilemap.scene.textures.exists(textureKey)) continue;
    const tw = ts.tileWidth ?? 64;
    const th = ts.tileHeight ?? 64;
    const added = tilemap.addTilesetImage(ts.name, textureKey, tw, th);
    if (added) out.push(added);
  }
  return out;
}

export function renderDonorPydewMapLayers(
  _scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  tilesets: Phaser.Tilemaps.Tileset[],
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (tilesets.length === 0) return;

  const depthOrder = [
    'Ground',
    'Forest Grass',
    'Outside Decoration',
    'Hills',
    'Fence',
    'HouseFloor',
    'HouseWalls',
    'HouseFurnitureBottom',
    'HouseFurnitureTop',
  ];

  const byName = new Map(tilemap.layers.map((l) => [l.name, l]));
  let depth = 0;
  for (const name of depthOrder) {
    if (!byName.has(name) || SKIP_LAYERS.has(name)) continue;
    if (!tilemap.getLayer(name)) continue;
    const created = tilemap.createLayer(name, tilesets, 0, 0);
    if (created) {
      created.setDepth(depth);
      depth += 1;
      pushLayer(created);
    }
  }

  for (const layerData of tilemap.layers) {
    const name = layerData.name;
    if (SKIP_LAYERS.has(name) || depthOrder.includes(name)) continue;
    if (!tilemap.getLayer(name)) continue;
    const created = tilemap.createLayer(name, tilesets, 0, 0);
    if (created) {
      created.setDepth(depth);
      depth += 1;
      pushLayer(created);
    }
  }

  const collision = tilemap.createLayer('Collision', tilesets, 0, 0);
  if (collision) {
    collision.setVisible(false);
    pushLayer(collision);
  }
}