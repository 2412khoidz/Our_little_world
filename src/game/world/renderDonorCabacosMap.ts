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
  'OLW_ContractSoil',
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
    if (name === 'olw_roof_overhang') {
      const layer = tilemap.getLayer(name);
      if (layer) {
        for (let ty = 0; ty < layer.height; ty += 1) {
          let rowLayer: Phaser.Tilemaps.TilemapLayer | null = null;
          for (let tx = 0; tx < layer.width; tx += 1) {
            const tile = layer.data[ty]?.[tx];
            if (!tile || tile.index <= 0) continue;
            if (!rowLayer) {
              rowLayer = tilemap.createBlankLayer(`olw_roof_row_${ty}`, tilesets, 0, 0);
              if (!rowLayer) break;
              rowLayer.setDepth((ty + 1.2) * TILE_SIZE);
              pushLayer(rowLayer);
            }
            rowLayer.putTileAt(tile.index, tx, ty);
          }
        }
      }
      continue;
    }
    const props = (layerData as { properties?: { name: string; value: number }[] }).properties ?? [];
    const olwDepth = props.find((p) => p.name === 'olwDepth')?.value;
    const depthProp = props.find((p) => p.name === 'gamemaker_depth')?.value;
    const depth = olwDepth !== undefined ? olwDepth : depthProp !== undefined ? -depthProp / 100 : 0;
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

export function renderDonorCabacosImageInteriorFromMap(
  scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  const textureKey = tiledMapPropertyValue(tilemap, 'olwDonorInteriorTextureKey');
  if (typeof textureKey !== 'string' || !scene.textures.exists(textureKey)) return;
  const img = scene.add.image(0, 0, textureKey).setOrigin(0, 0).setDepth(0);
  pushLayer(img);
}

export function isDonorCabacosImageShop(tilemap: Phaser.Tilemaps.Tilemap): boolean {
  return isDonorCabacosMap(tilemap) && tiledMapPropertyValue(tilemap, 'olwShopRender') === 'image';
}

type TiledProperty = { name: string; value: string | number | boolean };

/** Tiled stores map `properties` as an array; Phaser assigns that to `tilemap.properties`. */
export function tiledMapPropertyValue(
  tilemap: Phaser.Tilemaps.Tilemap,
  propertyName: string,
): string | number | boolean | undefined {
  const props = tilemap.properties as TiledProperty[] | Record<string, unknown> | undefined;
  if (!props) return undefined;
  if (Array.isArray(props)) {
    const hit = props.find((p) => p.name === propertyName);
    return hit?.value;
  }
  return props[propertyName] as string | number | boolean | undefined;
}

export function isDonorCabacosMapFromCache(scene: Phaser.Scene, mapKey: string): boolean {
  const raw = scene.cache.tilemap.get(mapKey)?.data as { properties?: TiledProperty[] } | undefined;
  return raw?.properties?.some((p) => p.name === 'olwDonor' && p.value === 'cabacos') ?? false;
}

export function isDonorCabacosMap(tilemap: Phaser.Tilemaps.Tilemap): boolean {
  return tiledMapPropertyValue(tilemap, 'olwDonor') === 'cabacos';
}

const DONOR_TEXTURE_ALIASES: Record<string, string> = {
  ts_map: 'donor-cabacos-ts_map',
  ts_forest: 'donor-cabacos-ts_forest',
};

export function getDonorCabacosTilesets(
  tilemap: Phaser.Tilemaps.Tilemap,
): Phaser.Tilemaps.Tileset[] {
  const out: Phaser.Tilemaps.Tileset[] = [];
  for (const ts of tilemap.tilesets) {
    const textureKey =
      ts.name === 'tileset-cozy'
        ? 'tileset-cozy'
        : (DONOR_TEXTURE_ALIASES[ts.name] ?? `donor-cabacos-${ts.name}`);
    if (!sceneHasTexture(tilemap.scene, textureKey)) continue;
    const tw = ts.tileWidth ?? TILE_SIZE;
    const th = ts.tileHeight ?? TILE_SIZE;
    const added = tilemap.addTilesetImage(ts.name, textureKey, tw, th);
    if (added) out.push(added);
  }
  return out;
}

function sceneHasTexture(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}