import Phaser from 'phaser';
import type { MapId } from '../../shared/types';
import { TILE_SIZE } from '../../shared/maps';
import extIds from '../art/worldExtendedArtIds.json';
import { BEACH_CRAB_SHEET_KEY, WORLD_PROPS_KEY } from '../art/worldAtlas';
import { createAmbientMotes, placeSoftShadow, placeWarmLight, type FloatingMote } from '../artDemos/demoHelpers';
import {
  createChickenActorState,
  createCrabActorState,
  createDuckActorState,
  createSheepActorState,
  type ChickenActorState,
  type CrabActorState,
  type DuckActorState,
  type SheepActorState,
} from '../../shared/world/emergentWorldBehavior';
import { getStaticZonePropSpecs } from '../../shared/world/zonePropColliders';

export interface AmbientChickenHandle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  state: ChickenActorState;
  bubble?: Phaser.GameObjects.Text;
}

export interface AmbientDuckHandle {
  sprite: Phaser.GameObjects.Sprite;
  state: DuckActorState;
  lastRippleAtMs: number;
}

export interface AmbientSheepHandle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  state: SheepActorState;
  bubble?: Phaser.GameObjects.Text;
}

export interface AmbientCrabHandle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  state: CrabActorState;
}

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

function createAnimalBubble(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '7.5px',
      color: '#fff6e4',
      backgroundColor: '#2d1c22cc',
      padding: { x: 2.5, y: 1 },
      resolution: 4,
    })
    .setOrigin(0.5, 1)
    .setDepth(9440)
    .setVisible(false);
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
  chickens?: AmbientChickenHandle[];
  ducks?: AmbientDuckHandle[];
  sheep?: AmbientSheepHandle[];
  crabs?: AmbientCrabHandle[];
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
  const chickens: AmbientChickenHandle[] = [];
  const ducks: AmbientDuckHandle[] = [];
  const sheep: AmbientSheepHandle[] = [];
  const crabs: AmbientCrabHandle[] = [];

  for (const spec of getStaticZonePropSpecs(mapId)) {
    addHollowmereProp(scene, pushLayer, spec.textureKey, spec.tileX, spec.tileY, spec.scale, {
      shadowW: spec.shadowW,
      depthOffset: spec.depthOffset,
      bobAmp: spec.bobAmp,
    });
  }

  if (mapId === 'farm') {
    if (hasProps) {
      if (scene.anims.exists('olw-duck')) {
        const startX = 33.5 * TILE_SIZE;
        const startY = 9.4 * TILE_SIZE;
        const duck = scene.add
          .sprite(startX, startY, WORLD_PROPS_KEY, `${extIds.sheets.duck}:0`)
          .setOrigin(0.5, 0.8)
          .setDepth(Math.round(startY));
        duck.play('olw-duck');
        pushLayer(duck);
        ducks.push({
          sprite: duck,
          lastRippleAtMs: 0,
          state: createDuckActorState(
            'farm_pond_duck_0',
            startX,
            startY,
            {
              minX: 31.8 * TILE_SIZE,
              maxX: 35.2 * TILE_SIZE,
              minY: 8.5 * TILE_SIZE,
              maxY: 10.6 * TILE_SIZE,
            },
            0.7,
          ),
        });
      }
      if (scene.anims.exists('olw-chicken')) {
        for (const [idx, [cx, cy]] of ([[10, 14], [12, 16], [18, 13]] as const).entries()) {
          const homeX = cx * TILE_SIZE;
          const homeY = cy * TILE_SIZE;
          const shadow = placeSoftShadow(scene, homeX, homeY - 1, 10, 4, homeY - 2, 0.36);
          const ch = scene.add
            .sprite(homeX, homeY, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
            .setOrigin(0.5, 0.85)
            .setDepth(Math.round(homeY));
          ch.play('olw-chicken');
          const bubble = createAnimalBubble(scene, homeX, homeY - 14);
          pushLayer(shadow);
          pushLayer(ch);
          pushLayer(bubble);
          chickens.push({
            sprite: ch,
            shadow,
            bubble,
            state: createChickenActorState(`farm_chicken_${idx}`, homeX, homeY, idx * 1.7),
          });
        }
      }
      if (scene.anims.exists('olw-sheep')) {
        for (const [idx, [sx, sy]] of ([[29, 25], [46, 29]] as const).entries()) {
          const homeX = sx * TILE_SIZE;
          const homeY = sy * TILE_SIZE;
          const shadow = placeSoftShadow(scene, homeX, homeY - 1, 14, 5, homeY - 2, 0.36);
          const sp = scene.add
            .sprite(homeX, homeY, WORLD_PROPS_KEY, `${extIds.sheets.sheep}:0`)
            .setOrigin(0.5, 0.85)
            .setDepth(Math.round(homeY));
          sp.play('olw-sheep');
          const bubble = createAnimalBubble(scene, homeX, homeY - 18);
          pushLayer(shadow);
          pushLayer(sp);
          pushLayer(bubble);
          sheep.push({
            sprite: sp,
            shadow,
            bubble,
            state: createSheepActorState(`farm_sheep_${idx}`, homeX, homeY, idx * 2.1),
          });
        }
      }
      const p1 = pxAt(34.5, 16.5);
      place(extIds.props.picnic_blanket, p1.x, p1.y, 0.5, 0.5, 3);
      place(extIds.props.beehive, 39 * TILE_SIZE, 26 * TILE_SIZE, 0.5, 1, 26 * TILE_SIZE);
    }

    pushLayer(placeWarmLight(scene, 13.5 * TILE_SIZE, 5.5 * TILE_SIZE, 36, 0xffd284, 0.22, 860));
    pushLayer(placeWarmLight(scene, 29.5 * TILE_SIZE, 20 * TILE_SIZE, 44, 0xffd896, 0.22, 860));

    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return {
      motes: createAmbientMotes(scene, bounds, 'petal', 16),
      moteBounds: bounds,
      chickens,
      ducks,
      sheep,
    };
  }

  if (mapId === 'village') {
    for (const [lx, ly] of [[42, 28], [32, 24], [27, 36], [15, 33], [79, 25]] as const) {
      pushLayer(placeWarmLight(scene, (lx + 0.5) * TILE_SIZE, (ly + 0.5) * TILE_SIZE, 42, 0xffd584, 0.24, 860));
    }
    if (hasProps) {
      const pic = pxAt(47, 29);
      place(extIds.props.picnic_blanket, pic.x, pic.y, 0.5, 0.5, 3);
      if (scene.anims.exists('olw-chicken')) {
        const homeX = 23 * TILE_SIZE;
        const homeY = 32 * TILE_SIZE;
        const shadow = placeSoftShadow(scene, homeX, homeY - 1, 10, 4, homeY - 2, 0.34);
        const ch = scene.add
          .sprite(homeX, homeY, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`)
          .setOrigin(0.5, 0.85)
          .setDepth(Math.round(homeY));
        ch.play('olw-chicken');
        const bubble = createAnimalBubble(scene, homeX, homeY - 14);
        pushLayer(shadow);
        pushLayer(ch);
        pushLayer(bubble);
        chickens.push({
          sprite: ch,
          shadow,
          bubble,
          state: createChickenActorState('village_chicken_0', homeX, homeY, 2.3),
        });
      }
    }
    const bounds = { x: 24, y: 24, w: worldWidthPx - 48, h: worldHeightPx - 48 };
    return { motes: createAmbientMotes(scene, bounds, 'petal', 12), moteBounds: bounds, chickens };
  }

  if (mapId === 'beach') {
    if (hasProps) {
      const pic = pxAt(15, 22);
      place(extIds.props.picnic_blanket, pic.x, pic.y, 0.5, 0.5, 3);
      place(extIds.props.picnic_basket, pic.x - 10, pic.y - 4, 0.5, 1, Math.round(pic.y));
      place(extIds.props.picnic_teacup, pic.x + 8, pic.y + 2, 0.5, 1, Math.round(pic.y));
    }

    if (scene.textures.exists(BEACH_CRAB_SHEET_KEY) && scene.anims.exists('olw-crab')) {
      const crabSpecs = [
        [26.4, 12, 'y', 28],
        [24.6, 21, 'y', 24],
        [22.8, 26.5, 'y', 22],
      ] as const;
      for (const [idx, [tx, ty, axis, span]] of crabSpecs.entries()) {
        const homeX = tx * TILE_SIZE;
        const homeY = ty * TILE_SIZE;
        const shadow = placeSoftShadow(scene, homeX, homeY - 1, 9, 3.5, homeY - 2, 0.34);
        const crabSprite = scene.add
          .sprite(homeX, homeY, BEACH_CRAB_SHEET_KEY, 0)
          .setOrigin(0.5, 0.85)
          .setScale(0.78)
          .setDepth(Math.round(homeY));
        crabSprite.play('olw-crab');
        pushLayer(shadow);
        pushLayer(crabSprite);
        crabs.push({
          sprite: crabSprite,
          shadow,
          state: createCrabActorState(`beach_crab_${idx}`, homeX, homeY, axis, span, idx * 1.4),
        });
      }
    }

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
    return { motes: createAmbientMotes(scene, bounds, 'firefly', 14), moteBounds: bounds, crabs };
  }

  if (mapId === 'forest') {
    pushLayer(placeWarmLight(scene, 21.5 * TILE_SIZE, 18 * TILE_SIZE, 40, 0xdcf79e, 0.2, 860));
    pushLayer(placeWarmLight(scene, 11.5 * TILE_SIZE, 22 * TILE_SIZE, 36, 0xffe49e, 0.18, 860));
    const bounds = { x: 16, y: 16, w: worldWidthPx - 32, h: worldHeightPx - 32 };
    return { motes: createAmbientMotes(scene, bounds, 'firefly', 18), moteBounds: bounds };
  }

  return { motes: [] };
}
