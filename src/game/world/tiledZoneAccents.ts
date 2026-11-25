import type Phaser from 'phaser';
import type { MapId } from '../../shared/types';
import { TILE_SIZE } from '../../shared/maps';
import extIds from '../art/worldExtendedArtIds.json';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';

type PlaceProp = (
  frameId: string,
  x: number,
  y: number,
  originX?: number,
  originY?: number,
  depth?: number,
) => Phaser.GameObjects.Image | null;

function at(tx: number, ty: number, ox = 0.5, oy = 1): { x: number; y: number; ox: number; oy: number } {
  return { x: (tx + ox) * TILE_SIZE, y: (ty + oy) * TILE_SIZE, ox, oy };
}

const P = extIds.props;

export function applyTiledZoneAccents(
  mapId: MapId,
  place: PlaceProp,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  scene: Phaser.Scene,
): void {
  if (mapId === 'village') {
    const placeAt = (propId: string, tx: number, ty: number, ox = 0.5, oy = 1) => {
      const pos = at(tx, ty, ox, oy);
      place(propId, pos.x, pos.y, pos.ox, pos.oy, Math.round(pos.y));
    };
    placeAt(P.mailbox_red, 5, 20);
    placeAt(P.planter_box, 13, 15);
    placeAt(P.planter_box, 35, 15);
    placeAt(P.planter_box, 13, 25);
    placeAt(P.planter_box, 35, 25);
    placeAt(P.picnic_blanket, 29, 21);
    placeAt(P.picnic_basket, 30, 20);
    placeAt(P.fence_1w, 22, 17);
    placeAt(P.fence_1w, 26, 17);
    placeAt(P.fence_1w, 22, 23);
    placeAt(P.fence_1w, 26, 23);
    placeAt(P.sunflower, 17, 20);
    placeAt(P.sunflower, 31, 20);
    placeAt(P.sakura_bush, 39, 14, 0.5, 1);
    placeAt(P.beehive, 37, 17);
    placeAt(P.water_reed_a, 10, 33);
    placeAt(P.water_reed_b, 11, 34);
    placeAt(P.bridge_wood, 10, 31, 0, 1);
    placeAt(P.fence_3w, 23, 13, 0.5, 1);
    return;
  }

  if (mapId === 'farm') {
    const placeAt = (propId: string, tx: number, ty: number, ox = 0.5, oy = 1) => {
      const pos = at(tx, ty, ox, oy);
      place(propId, pos.x, pos.y, pos.ox, pos.oy, Math.round(pos.y));
    };
    placeAt(P.fence_3w, 14, 8);
    placeAt(P.planter_box, 7, 6);
    placeAt(P.sunflower, 12, 8);
    placeAt(P.tomato, 16, 7);
    placeAt(P.corn, 18, 7);
    placeAt(P.radish, 42, 27);
    placeAt(P.beetroot, 46, 27);
    placeAt(P.water_reed_a, 50, 11);
    placeAt(P.water_reed_b, 51, 12);
    placeAt(P.bridge_wood, 51, 10, 0, 1);
    placeAt(P.beehive, 6, 5);
    placeAt(P.picnic_blanket, 32, 17);

    if (scene.textures.exists(WORLD_PROPS_KEY) && scene.anims.exists('olw-windmill')) {
      const wx = 59 * TILE_SIZE + 8;
      const wy = 4 * TILE_SIZE + 14;
      const windmill = scene.add
        .sprite(wx, wy, WORLD_PROPS_KEY, `${extIds.sheets.windmill}:0`)
        .setOrigin(0.5, 0.92)
        .setDepth(Math.round(wy));
      windmill.play('olw-windmill');
      pushLayer(windmill);
    }
    if (scene.textures.exists(WORLD_PROPS_KEY) && scene.anims.exists('olw-chicken')) {
      const cx = 11 * TILE_SIZE;
      const cy = 10 * TILE_SIZE;
      const chicken = scene.add
        .sprite(cx, cy, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
        .setOrigin(0.5, 0.85)
        .setDepth(Math.round(cy));
      chicken.play('olw-chicken');
      pushLayer(chicken);
    }
  }
}