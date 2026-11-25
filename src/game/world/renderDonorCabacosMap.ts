import Phaser from 'phaser';
import { TILE_SIZE } from '../../shared/maps';

const SKIP_LAYERS = new Set([
  'Collision',
  'buy_farm2_collision',
  'buy_farm3_collision',
  'Interactions',
  'Portals',
  'Interactables',
  'NPCSpawns',
]);

/** Cabacos / GameMaker export layer draw order (depth from `gamemaker_depth` when present). */
export function renderDonorCabacosMapLayers(
  _scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  tilesets: Phaser.Tilemaps.Tileset[],
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (tilesets.length === 0) return;

  for (const layerData of tilemap.layers) {
    const name = layerData.name;
    if (SKIP_LAYERS.has(name)) continue;
    if (!tilemap.getLayer(name)) continue;
    const depthProp = (layerData as { properties?: { name: string; value: number }[] }).properties?.find(
      (p) => p.name === 'gamemaker_depth',
    );
    const depth = depthProp?.value !== undefined ? -depthProp.value / 100 : 0;
    const created = tilemap.createLayer(name, tilesets, 0, 0);
    if (created) {
      created.setDepth(depth);
      pushLayer(created);
    }
  }

  const collision = tilemap.createLayer('Collision', tilesets, 0, 0);
  if (collision) {
    collision.setVisible(false);
    pushLayer(collision);
  }
}

export function renderDonorCabacosShopInterior(
  scene: Phaser.Scene,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  if (!scene.textures.exists('donor-cabacos-house-interior')) return;
  const img = scene.add.image(0, 0, 'donor-cabacos-house-interior').setOrigin(0, 0).setDepth(0);
  pushLayer(img);
}

export function isDonorCabacosMap(tilemap: Phaser.Tilemaps.Tilemap): boolean {
  const props = tilemap.properties as Record<string, unknown> | undefined;
  if (props?.olwDonor === 'cabacos') return true;
  const list = (tilemap as Phaser.Tilemaps.Tilemap & { data?: { properties?: { name: string; value: string }[] } }).data
    ?.properties;
  return list?.some((p) => p.name === 'olwDonor' && p.value === 'cabacos') ?? false;
}

export function getDonorCabacosTilesets(
  tilemap: Phaser.Tilemaps.Tilemap,
): Phaser.Tilemaps.Tileset[] {
  const out: Phaser.Tilemaps.Tileset[] = [];
  for (const ts of tilemap.tilesets) {
    const key = `donor-cabacos-${ts.name}`;
    if (!sceneHasTexture(tilemap.scene, key)) continue;
    const added = tilemap.addTilesetImage(ts.name, key, ts.tileWidth ?? TILE_SIZE, ts.tileHeight ?? TILE_SIZE);
    if (added) out.push(added);
  }
  return out;
}

function sceneHasTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}