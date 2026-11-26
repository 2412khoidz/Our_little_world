import Phaser from 'phaser';
import type { MapId } from '../../shared/types';
import { TILE_SIZE } from '../../shared/maps';
import extIds from '../art/worldExtendedArtIds.json';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import { createAmbientMotes, placeSoftShadow, placeWarmLight, type FloatingMote } from '../artDemos/demoHelpers';

type PlaceProp = (
  frameId: string,
  x: number,
  y: number,
  originX?: number,
  originY?: number,
  depth?: number,
) => Phaser.GameObjects.Image | null;

function pxAt(tx: number, ty: number, ox = 0.5, oy = 1): { x: number; y: number } {
  return { x: (tx + ox) * TILE_SIZE, y: (ty + oy) * TILE_SIZE };
}

function addHollowmereProp(
  scene: Phaser.Scene,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  key: string,
  tx: number,
  ty: number,
  scale = 0.5,
  options?: { depthOffset?: number; shadowW?: number; originY?: number; bobAmp?: number },
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(key)) return null;
  const x = (tx + 0.5) * TILE_SIZE;
  const y = (ty + 1) * TILE_SIZE;
  const oy = options?.originY ?? 1;
  const img = scene.add
    .image(Math.round(x), Math.round(y), key)
    .setOrigin(0.5, oy)
    .setScale(scale)
    .setDepth(Math.round(y + (options?.depthOffset ?? 0)));
  if (options?.shadowW) {
    pushLayer(placeSoftShadow(scene, x, y - 1, options.shadowW, Math.max(6, Math.round(options.shadowW * 0.3)), Math.round(y) - 2, 0.38));
  }
  if (options?.bobAmp) {
    scene.tweens.add({
      targets: img,
      y: img.y - options.bobAmp,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
  pushLayer(img);
  return img;
}

export interface ZoneAccentResult {
  motes: FloatingMote[];
  moteBounds?: { x: number; y: number; w: number; h: number };
}

/**
 * Adds living pixel-art props, animated water/wildlife, warm lantern lighting,
 * and ambient motes across reconstructed Tiled zones (both public & private art).
 */
export function applyTiledZoneAccents(
  mapId: MapId,
  worldWidthPx: number,
  worldHeightPx: number,
  place: PlaceProp,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
  scene: Phaser.Scene,
): ZoneAccentResult {
  const hasProps = scene.textures.exists(WORLD_PROPS_KEY);

  if (mapId === 'farm') {
    // Greenhouse on NW overlook + Barn / Farmhouse & Meadowbrook Windmill
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-greenhouse', 18, 8, 0.44, { shadowW: 72 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-farmhouse', 8, 9, 0.46, { shadowW: 66 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-shipping-bin', 13, 5, 0.55, { shadowW: 18 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-windmill', 9.5, 21.5, 0.72, { shadowW: 24 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-scarecrow', 22, 9, 0.62, { shadowW: 14 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-wishing-well', 30, 14, 0.55, { shadowW: 20 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-hay-bale', 8, 24, 0.55, { shadowW: 16 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-hay-bale', 10, 24, 0.55, { shadowW: 16 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-bench', 35, 11, 0.55, { shadowW: 22 });

    // Pond animations + farm animals
    if (hasProps) {
      if (scene.anims.exists('olw-duck')) {
        const duck = scene.add
          .sprite(33.5 * TILE_SIZE, 9.2 * TILE_SIZE, WORLD_PROPS_KEY, `${extIds.sheets.duck}:0`)
          .setOrigin(0.5, 0.8)
          .setDepth(Math.round(9.2 * TILE_SIZE));
        duck.play('olw-duck');
        pushLayer(duck);
      }
      if (scene.anims.exists('olw-chicken')) {
        for (const [cx, cy] of [[10, 14], [12, 16]] as const) {
          pushLayer(placeSoftShadow(scene, cx * TILE_SIZE, cy * TILE_SIZE - 1, 10, 4, cy * TILE_SIZE - 2, 0.36));
          const ch = scene.add
            .sprite(cx * TILE_SIZE, cy * TILE_SIZE, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
            .setOrigin(0.5, 0.85)
            .setDepth(Math.round(cy * TILE_SIZE));
          ch.play('olw-chicken');
          pushLayer(ch);
        }
      }
      if (scene.anims.exists('olw-sheep')) {
        pushLayer(placeSoftShadow(scene, 48 * TILE_SIZE, 30 * TILE_SIZE - 1, 14, 5, 30 * TILE_SIZE - 2, 0.36));
        const sheep = scene.add
          .sprite(48 * TILE_SIZE, 30 * TILE_SIZE, WORLD_PROPS_KEY, `${extIds.sheets.sheep}:0`)
          .setOrigin(0.5, 0.85)
          .setDepth(Math.round(30 * TILE_SIZE));
        sheep.play('olw-sheep');
        pushLayer(sheep);
      }
      const p1 = pxAt(34.5, 16.5);
      place(extIds.props.picnic_blanket, p1.x, p1.y, 0.5, 0.5, 3);
      place(extIds.props.beehive, 39 * TILE_SIZE, 26 * TILE_SIZE, 0.5, 1, 26 * TILE_SIZE);
    }

    pushLayer(placeWarmLight(scene, 13.5 * TILE_SIZE, 5.5 * TILE_SIZE, 36, 0xffd284, 0.22, 860));
    pushLayer(placeWarmLight(scene, 29.5 * TILE_SIZE, 20 * TILE_SIZE, 44, 0xffd896, 0.22, 860));

    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return { motes: createAmbientMotes(scene, bounds, 'petal', 16), moteBounds: bounds };
  }

  if (mapId === 'village') {
    // Cozy bakery / cafe patio in Hollow nook + warm streetlamps
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-cafe', 19, 30, 0.36, { shadowW: 54 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-string-lights', 42, 26, 0.65, { depthOffset: 40 });
    for (const [lx, ly] of [[42, 28], [32, 24], [27, 36], [15, 33], [79, 25]] as const) {
      pushLayer(placeWarmLight(scene, (lx + 0.5) * TILE_SIZE, (ly + 0.5) * TILE_SIZE, 42, 0xffd584, 0.24, 860));
    }
    if (hasProps) {
      const pic = pxAt(47, 29);
      place(extIds.props.picnic_blanket, pic.x, pic.y, 0.5, 0.5, 3);
      if (scene.anims.exists('olw-chicken')) {
        const ch = scene.add
          .sprite(23 * TILE_SIZE, 32 * TILE_SIZE, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
          .setOrigin(0.5, 0.85)
          .setDepth(Math.round(32 * TILE_SIZE));
        ch.play('olw-chicken');
        pushLayer(ch);
      }
    }
    const bounds = { x: 24, y: 24, w: worldWidthPx - 48, h: worldHeightPx - 48 };
    return { motes: createAmbientMotes(scene, bounds, 'petal', 12), moteBounds: bounds };
  }

  if (mapId === 'beach') {
    // Coastal harbor & shoreline landmarks from Hollowmere (MIT) + cozy sunset bench props
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-ferry', 39, 21, 0.72, { shadowW: 56, bobAmp: 2.2 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-cafe', 14, 11, 0.44, { shadowW: 68 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-palm', 11, 14, 0.72, { shadowW: 20 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-palm', 24, 11, 0.75, { shadowW: 20 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-palm', 17, 24, 0.7, { shadowW: 20 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-crab-pot', 34.5, 19.2, 0.6, { shadowW: 10, bobAmp: 1.0 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-crab-pot', 28, 28, 0.6, { shadowW: 12 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-bench', 21, 16, 0.62, { shadowW: 22 });

    if (hasProps) {
      const pic = pxAt(15, 22);
      place(extIds.props.picnic_blanket, pic.x, pic.y, 0.5, 0.5, 3);
      place(extIds.props.picnic_basket, pic.x - 10, pic.y - 4, 0.5, 1, Math.round(pic.y));
      place(extIds.props.picnic_teacup, pic.x + 8, pic.y + 2, 0.5, 1, Math.round(pic.y));
    }

    // Gentle sunlit ocean sparkles over eastern & southern bay
    for (let i = 0; i < 14; i += 1) {
      const wx = (29 + (i * 5) % 24) * TILE_SIZE + 8;
      const wy = (8 + (i * 7) % 25) * TILE_SIZE + 8;
      const glint = scene.add.rectangle(wx, wy, 3, 1, 0xe8fbff, 0.72).setDepth(3.5);
      scene.tweens.add({
        targets: glint,
        alpha: { from: 0.15, to: 0.85 },
        scaleX: { from: 0.6, to: 1.5 },
        duration: 1100 + (i % 5) * 240,
        yoyo: true,
        repeat: -1,
        delay: i * 160,
      });
      pushLayer(glint);
    }

    pushLayer(placeWarmLight(scene, 14.5 * TILE_SIZE, 11.5 * TILE_SIZE, 48, 0xffd284, 0.24, 860));
    pushLayer(placeWarmLight(scene, 21.5 * TILE_SIZE, 16 * TILE_SIZE, 44, 0xffcb80, 0.22, 860));
    pushLayer(placeWarmLight(scene, 34.5 * TILE_SIZE, 16.5 * TILE_SIZE, 38, 0xffdf99, 0.24, 860));

    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return { motes: createAmbientMotes(scene, bounds, 'firefly', 14), moteBounds: bounds };
  }

  if (mapId === 'forest') {
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-bench', 21, 18, 0.58, { shadowW: 20 });
    addHollowmereProp(scene, pushLayer, 'donor-hollowmere-wishing-well', 11, 22, 0.52, { shadowW: 18 });
    pushLayer(placeWarmLight(scene, 21.5 * TILE_SIZE, 18 * TILE_SIZE, 40, 0xdcf79e, 0.2, 860));
    pushLayer(placeWarmLight(scene, 11.5 * TILE_SIZE, 22 * TILE_SIZE, 36, 0xffe49e, 0.18, 860));
    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return { motes: createAmbientMotes(scene, bounds, 'firefly', 18), moteBounds: bounds };
  }

  return { motes: [] };
}
